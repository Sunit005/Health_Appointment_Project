import { registerRequestSchema } from '@healthcare/shared';

/**
 * Zod schema for validating the POST /api/v1/auth/register request body.
 * Re-uses the shared schema to keep frontend and backend validation in sync.
 */
export const registerSchema = registerRequestSchema;
