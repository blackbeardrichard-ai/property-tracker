import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';

const calcNextDue = (lastDone, freqMonths) => {
  if (!lastDone || !freqMonths) return null;
  const d = new Date(lastDone);
  const days = Math.round(freqMonths * 30.4375);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export function useServices(propertyId) {
  const { user, profile } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select(`*, service_logs(*)`)
      .eq('property_id', propertyId)
      .order('next_due', { ascending: true, nullsFirst: false });
    setServices(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const addService = async (svc) => {
    await supabase.from('services').insert({
      property_id: propertyId,
      name: svc.name,
      freq_months: svc.freqMonths || null,
      is_recurring: svc.isRecurring !== false,
      notes: svc.notes || null,
      created_by: user.id,
    });
    fetchServices();
  };

  const deleteService = async (serviceId) => {
    const svc = services.find(s => s.id === serviceId);
    await supabase.from('services').delete().eq('id', serviceId);
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'deleted', entityType: 'service', entityId: serviceId, entityName: svc?.name });
    fetchServices();
  };

  const logService = async (serviceId, logData) => {
    const svc = services.find(s => s.id === serviceId);
    const nextDue = svc?.is_recurring ? calcNextDue(logData.doneDate, svc.freq_months) : null;

    // Insert log entry
    await supabase.from('service_logs').insert({
      service_id: serviceId,
      property_id: propertyId,
      done_date: logData.doneDate,
      company: logData.company || null,
      invoice_number: logData.invoiceNumber || null,
      invoice_amount: logData.invoiceAmount || null,
      warranty: logData.warranty || false,
      warranty_months: logData.warrantyMonths || null,
      warranty_expiry: logData.warrantyExpiry || null,
      notes: logData.notes || null,
      logged_by: user.id,
    });

    // Update service last_done and next_due
    await supabase.from('services').update({
      last_done: logData.doneDate,
      next_due: nextDue,
    }).eq('id', serviceId);

    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'logged', entityType: 'service', entityId: serviceId, entityName: svc?.name, newValue: { doneDate: logData.doneDate, company: logData.company } });

    fetchServices();
  };

  return { services, loading, addService, deleteService, logService, fetchServices };
}
