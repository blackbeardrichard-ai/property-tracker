import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';
import { calcNextDue } from '../lib/format';

const sortByDue = list => [...list].sort((a, b) => {
  if (!a.next_due && !b.next_due) return (a.name || '').localeCompare(b.name || '');
  if (!a.next_due) return 1;
  if (!b.next_due) return -1;
  return a.next_due < b.next_due ? -1 : a.next_due > b.next_due ? 1 : 0;
});
const newestFirst = logs => [...(logs || [])].sort((a, b) => (a.done_date < b.done_date ? 1 : -1));

// Services for one property. Fetched once per property page and shared.
export function useServices(propertyId) {
  const { user, profile } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(services);
  ref.current = services;

  const log = (action, id, name, newValue = null) =>
    logAction({ propertyId, userId: user.id, userName: profile?.full_name, action, entityType: 'service', entityId: id, entityName: name, newValue });

  const fetchServices = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await supabase.from('services').select('*, service_logs(*)').eq('property_id', propertyId);
    setServices(sortByDue((data || []).map(s => ({ ...s, service_logs: newestFirst(s.service_logs) }))));
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const patchLocal = (id, patch) => setServices(prev => sortByDue(prev.map(s => (s.id === id ? { ...s, ...patch } : s))));

  // svc: { name, freqMonths, isRecurring, notes, lastDone?, firstDue? }
  const addService = async (svc) => {
    const freq = svc.isRecurring ? (Number(svc.freqMonths) || 12) : null;
    const next_due = svc.firstDue || (svc.lastDone && svc.isRecurring ? calcNextDue(svc.lastDone, freq) : null);
    const { data, error } = await supabase.from('services').insert({
      property_id: propertyId, name: svc.name, freq_months: freq, is_recurring: !!svc.isRecurring,
      notes: svc.notes || null, last_done: svc.lastDone || null, next_due, created_by: user.id,
    }).select().single();
    if (error) return { error };
    setServices(prev => sortByDue([...prev, { ...data, service_logs: [] }]));
    log('created', data.id, svc.name);
    return { data };
  };

  // Give a never-logged service a schedule: either the date it was last done
  // (next due is calculated) or the date it is first due.
  const setSchedule = async (serviceId, { lastDone, firstDue }) => {
    const svc = ref.current.find(s => s.id === serviceId);
    if (!svc) return { error: { message: 'Service not found' } };
    const patch = lastDone
      ? { last_done: lastDone, next_due: svc.is_recurring ? calcNextDue(lastDone, svc.freq_months) : null }
      : { next_due: firstDue };
    patchLocal(serviceId, patch);
    const { error } = await supabase.from('services').update(patch).eq('id', serviceId);
    if (error) { patchLocal(serviceId, { last_done: svc.last_done, next_due: svc.next_due }); return { error }; }
    log('scheduled', serviceId, svc.name, patch);
    return {};
  };

  const deleteService = async (serviceId) => {
    const svc = ref.current.find(s => s.id === serviceId);
    setServices(prev => prev.filter(s => s.id !== serviceId));
    await supabase.from('services').delete().eq('id', serviceId);
    log('deleted', serviceId, svc?.name);
  };

  const logService = async (serviceId, f) => {
    const svc = ref.current.find(s => s.id === serviceId);
    if (!svc) return { error: { message: 'Service not found' } };
    const next_due = svc.is_recurring ? calcNextDue(f.doneDate, svc.freq_months) : null;
    const row = {
      service_id: serviceId, property_id: propertyId, done_date: f.doneDate,
      company: f.company || null, invoice_number: f.invoiceNumber || null, invoice_amount: f.invoiceAmount || null,
      warranty: !!f.warranty, warranty_months: f.warranty ? (f.warrantyMonths || null) : null,
      warranty_expiry: f.warranty && f.warrantyMonths ? calcNextDue(f.doneDate, f.warrantyMonths) : null,
      notes: f.notes || null, logged_by: user.id,
    };
    const { data: logRow, error } = await supabase.from('service_logs').insert(row).select().single();
    if (error) return { error };
    await supabase.from('services').update({ last_done: f.doneDate, next_due }).eq('id', serviceId);
    patchLocal(serviceId, { last_done: f.doneDate, next_due, service_logs: newestFirst([logRow, ...(svc.service_logs || [])]) });
    log('logged', serviceId, svc.name, { doneDate: f.doneDate, company: f.company });
    return {};
  };

  return { services, loading, fetchServices, addService, setSchedule, deleteService, logService };
}
