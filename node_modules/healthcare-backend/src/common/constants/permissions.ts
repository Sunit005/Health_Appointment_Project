import type { UserRole } from '@healthcare/shared';
import { Roles } from './roles.js';

/**
 * Granular permission strings used by the `authorize` middleware.
 */
export const Permission = {
  // User
  READ_OWN_PROFILE: 'user:read:own',
  UPDATE_OWN_PROFILE: 'user:update:own',

  // Patients
  READ_ANY_PATIENT: 'patient:read:any',
  READ_OWN_PATIENT: 'patient:read:own',
  UPDATE_OWN_PATIENT: 'patient:update:own',

  // Doctors
  READ_ANY_DOCTOR: 'doctor:read:any',
  UPDATE_OWN_DOCTOR: 'doctor:update:own',

  // Appointments
  CREATE_APPOINTMENT: 'appointment:create',
  READ_OWN_APPOINTMENTS: 'appointment:read:own',
  READ_ANY_APPOINTMENT: 'appointment:read:any',
  UPDATE_OWN_APPOINTMENT: 'appointment:update:own',
  CANCEL_OWN_APPOINTMENT: 'appointment:cancel:own',
  MANAGE_ANY_APPOINTMENT: 'appointment:manage:any',

  // Schedule
  MANAGE_OWN_SCHEDULE: 'schedule:manage:own',

  // Medical records
  READ_OWN_RECORDS: 'records:read:own',
  READ_LINKED_RECORDS: 'records:read:linked',
  CREATE_RECORDS: 'records:create',

  // Admin
  MANAGE_USERS: 'admin:users:manage',
  VIEW_AUDIT_LOGS: 'admin:audit:read',
  VIEW_METRICS: 'admin:metrics:read',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

/**
 * Maps each role to its granted permissions.
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionValue[]> = {
  [Roles.PATIENT]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.READ_OWN_PATIENT,
    Permission.UPDATE_OWN_PATIENT,
    Permission.READ_ANY_DOCTOR,
    Permission.CREATE_APPOINTMENT,
    Permission.READ_OWN_APPOINTMENTS,
    Permission.CANCEL_OWN_APPOINTMENT,
    Permission.UPDATE_OWN_APPOINTMENT,
    Permission.READ_OWN_RECORDS,
  ],

  [Roles.DOCTOR]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.UPDATE_OWN_DOCTOR,
    Permission.READ_OWN_APPOINTMENTS,
    Permission.READ_ANY_APPOINTMENT,
    Permission.MANAGE_OWN_SCHEDULE,
    Permission.READ_LINKED_RECORDS,
    Permission.CREATE_RECORDS,
  ],

  [Roles.ADMIN]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.READ_ANY_PATIENT,
    Permission.READ_ANY_DOCTOR,
    Permission.MANAGE_ANY_APPOINTMENT,
    Permission.READ_ANY_APPOINTMENT,
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_METRICS,
    Permission.READ_LINKED_RECORDS,
  ],
};
