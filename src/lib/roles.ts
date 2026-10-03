export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  DEV: 'dev',
} as const

export type UserRole = typeof ROLES[keyof typeof ROLES]

// What each role can access
export const ROLE_PERMISSIONS = {
  canManageStaff: ['super_admin', 'dev'],
  canModifyStaff: ['super_admin', 'dev'],
  canManageProviders: ['super_admin', 'dev'],
  canManageFacilities: ['super_admin', 'dev'],
  canViewClinicalRecords: ['super_admin', 'admin', 'doctor', 'dev'],
  canEditClinicalRecords: ['super_admin', 'admin', 'doctor', 'dev'],
  canViewPatients: ['super_admin', 'admin', 'doctor', 'receptionist', 'dev'],
  canRegisterPatients: ['super_admin', 'admin', 'doctor', 'receptionist', 'dev'],
  canScheduleAppointments: ['super_admin', 'admin', 'doctor', 'receptionist', 'dev'],
  canManageSettings: ['super_admin', 'admin', 'dev'],
  canAccessDevSandbox: ['super_admin', 'admin', 'doctor', 'receptionist', 'dev'],
  canUseAiFeatures: ['super_admin', 'admin', 'doctor', 'dev'],
}

export function hasPermission(role: string | null | undefined, permission: keyof typeof ROLE_PERMISSIONS): boolean {
  if (!role) return false
  return (ROLE_PERMISSIONS[permission] as string[]).includes(role)
}
