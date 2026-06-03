import { supabase } from './supabase';

export async function logAction({
  propertyId,
  userId,
  userName,
  action,
  entityType,
  entityId,
  entityName,
  oldValue = null,
  newValue = null,
}) {
  try {
    await supabase.from('audit_log').insert({
      property_id:  propertyId,
      user_id:      userId,
      user_name:    userName,
      action,
      entity_type:  entityType,
      entity_id:    entityId,
      entity_name:  entityName,
      old_value:    oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      new_value:    newValue ? JSON.parse(JSON.stringify(newValue)) : null,
    });
  } catch (e) {
    // Audit log failure should never break the main action
    console.warn('Audit log failed:', e);
  }
}

