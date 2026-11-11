import { supabase } from './supabase';
import { logAction } from './audit';

// Correct a material's name, quantity or unit. Used wherever a material is listed.
export async function saveMaterialEdit(material, patch, { userId, userName }) {
  const { error } = await supabase.from('materials').update(patch).eq('id', material.id);
  if (!error) {
    logAction({ propertyId: material.property_id, userId, userName, action: 'updated', entityType: 'material', entityId: material.id,
      entityName: patch.name || material.name, newValue: patch });
  }
  return { error };
}
