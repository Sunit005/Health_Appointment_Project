import { UserRole } from '@healthcare/shared';

/**
 * Re-exports the shared `UserRole` enum values as a convenience constant.
 * Prefer importing `UserRole` from `@healthcare/shared` for type usage.
 */
export const Roles = UserRole;

/** Array of all available roles for iteration/validation purposes */
export const ALL_ROLES = Object.values(UserRole) as UserRole[];
