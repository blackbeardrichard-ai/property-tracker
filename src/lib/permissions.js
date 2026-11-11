// Single source of truth for fine-grained capabilities.
// Used by AuthContext (to resolve can()) and by Settings → Users (to show/override them).

export const ROLES = ['admin', 'manager', 'technician', 'viewer'];

// capability → roles that have it by default (admin always has everything)
export const CAPABILITY_DEFAULTS = {
  edit_status_backward: ['admin'],
  advance_status:       ['admin', 'manager', 'technician'],
  edit_priority:        ['admin', 'manager'],
  view_asset_register:  ['admin'],
  global_search:        ['admin'],
  view_shopping_list:   ['admin'],
  data_export:          ['admin'],
};

// Capabilities an admin can override per user, in the order shown in Settings.
export const OVERRIDABLE_CAPABILITIES = [
  { key: 'edit_status_backward', label: 'Edit material status backward', hint: 'Change a material to any status, including reversing “Used”.' },
  { key: 'edit_priority',        label: 'Edit task priority',            hint: 'Set high / medium / low on tasks.' },
  { key: 'view_asset_register',  label: 'View global asset register',    hint: 'See assets across all properties they can access.' },
  { key: 'global_search',        label: 'Global search',                 hint: 'Search across all accessible properties.' },
  { key: 'view_shopping_list',   label: 'Global shopping list',          hint: 'See materials to buy across accessible properties.' },
  { key: 'data_export',          label: 'Data export',                   hint: 'Download data as an Excel workbook.' },
];

export const roleHasByDefault = (role, capability) =>
  role === 'admin' || (CAPABILITY_DEFAULTS[capability] || []).includes(role);
