import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';
import { todayISO } from '../lib/format';
import { uploadPhotos } from '../components/photos';

export function useAssets(propertyId) {
  const { user, profile } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('assets')
      .select(`*, asset_movements(*), asset_service_logs(*)`)
      .eq('current_property_id', propertyId)
      .order('name');
    // Resolve authoriser names client-side (avoids depending on the exact FK
    // constraint name for an embedded join).
    const ids = [...new Set((data || []).flatMap(a => (a.asset_movements||[]).map(m => m.authorised_by)).filter(Boolean))];
    let nameById = {};
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      (profs || []).forEach(p => { nameById[p.id] = p.full_name; });
    }
    const enriched = (data || []).map(a => ({
      ...a,
      asset_movements: (a.asset_movements||[]).map(m => ({ ...m, authoriser: { full_name: nameById[m.authorised_by] || null } })),
    }));
    setAssets(enriched);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const addAsset = async (asset) => {
    const { data, error } = await supabase.from('assets').insert({
      ...asset,
      current_property_id: propertyId,
      created_by: user.id,
    }).select().single();
    if (error) return { error };
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'created', entityType: 'asset', entityId: data.id, entityName: asset.name });
    fetchAssets();
    return { data };
  };

  const updateAsset = async (assetId, updates) => {
    const { error } = await supabase.from('assets').update(updates).eq('id', assetId);
    if (error) return { error };
    fetchAssets();
    return {};
  };

  const deleteAsset = async (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    await supabase.from('assets').delete().eq('id', assetId);
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'deleted', entityType: 'asset', entityId: assetId, entityName: asset?.name });
    fetchAssets();
  };

  const moveAsset = async (assetId, toPropertyId, reason) => {
    const asset = assets.find(a => a.id === assetId);
    await supabase.from('asset_movements').insert({
      asset_id: assetId,
      from_property: propertyId,
      to_property: toPropertyId,
      moved_date: todayISO(),
      reason,
      authorised_by: user.id,
    });
    await supabase.from('assets').update({ current_property_id: toPropertyId }).eq('id', assetId);
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'moved', entityType: 'asset', entityId: assetId, entityName: asset?.name, newValue: { toPropertyId, reason } });
    fetchAssets();
  };

  const logAssetService = async (assetId, logData) => {
    const asset = assets.find(a => a.id === assetId);
    const id = crypto?.randomUUID ? crypto.randomUUID() : undefined;
    const meter = logData.meterReading === '' || logData.meterReading == null ? null : Number(logData.meterReading);
    const { error } = await supabase.from('asset_service_logs').insert({
      ...(id ? { id } : {}),
      ...(meter != null ? { meter_reading: meter } : {}),
      asset_id: assetId,
      done_date: logData.doneDate,
      description: logData.description,
      company: logData.company || null,
      invoice_number: logData.invoiceNumber || null,
      invoice_amount: logData.invoiceAmount || null,
      next_service: logData.nextService || null,
      logged_by: user.id,
    });
    if (error) return { error };
    // The condition seen at the service is saved whether or not a next service date was given.
    const patch = {};
    if (logData.condition) patch.condition = logData.condition;
    if (meter != null) {
      patch.meter_reading = meter; patch.meter_date = logData.doneDate;
      if (asset?.service_interval) patch.next_service_meter = meter + Number(asset.service_interval);
    }
    if (Object.keys(patch).length) await supabase.from('assets').update(patch).eq('id', assetId);
    if (id && logData.files?.length) await uploadPhotos(propertyId, 'asset_service', id, logData.files);
    fetchAssets();
    return {};
  };

  // Hour meter / odometer reading.
  const logReading = async (assetId, reading, readOn) => {
    const r = Number(reading);
    const { error } = await supabase.from('meter_readings').insert({ property_id: propertyId, asset_id: assetId, reading: r, read_on: readOn });
    if (error) return { error };
    await supabase.from('assets').update({ meter_reading: r, meter_date: readOn }).eq('id', assetId);
    fetchAssets();
    return {};
  };

  // Hours or km, service interval, and when the next service is due on the meter.
  const setMeter = async (assetId, patch) => {
    const { error } = await supabase.from('assets').update(patch).eq('id', assetId);
    if (error) return { error };
    fetchAssets();
    return {};
  };

  return { assets, loading, addAsset, updateAsset, deleteAsset, moveAsset, logAssetService, logReading, setMeter, fetchAssets };
}
