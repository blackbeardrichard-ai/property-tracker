import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';

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
      moved_date: new Date().toISOString().split('T')[0],
      reason,
      authorised_by: user.id,
    });
    await supabase.from('assets').update({ current_property_id: toPropertyId }).eq('id', assetId);
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'moved', entityType: 'asset', entityId: assetId, entityName: asset?.name, newValue: { toPropertyId, reason } });
    fetchAssets();
  };

  const logAssetService = async (assetId, logData) => {
    await supabase.from('asset_service_logs').insert({
      asset_id: assetId,
      done_date: logData.doneDate,
      description: logData.description,
      company: logData.company || null,
      invoice_number: logData.invoiceNumber || null,
      invoice_amount: logData.invoiceAmount || null,
      next_service: logData.nextService || null,
      logged_by: user.id,
    });
    if (logData.nextService) {
      await supabase.from('assets').update({ condition: logData.condition || 'good' }).eq('id', assetId);
    }
    fetchAssets();
  };

  return { assets, loading, addAsset, updateAsset, deleteAsset, moveAsset, logAssetService, fetchAssets };
}
