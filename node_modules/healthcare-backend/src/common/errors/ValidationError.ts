import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { ErrorCode } from '../constants/errorCodes.js';

/**
 * Thrown when request payload fails Zod schema validation.
 * Formats Zod issues into user-friendly field-level error details.
 */
export class ValidationError extends AppError {
  constructor(zodError: ZodError) {
    const details = zodError.issues.map((issue) => ({
      field: issue.path.join('.') || undefined,
      message: issue.message,
    }));

    super('Validation failed', HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, true, details);
  }
}
