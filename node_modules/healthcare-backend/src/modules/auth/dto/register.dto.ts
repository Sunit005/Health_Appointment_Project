import type { RegisterRequest } from '@healthcare/shared';

/**
 * Data Transfer Object for the register endpoint.
 * The type is derived from the shared Zod schema to ensure full-stack alignment.
 */
export type RegisterDto = RegisterRequest;
