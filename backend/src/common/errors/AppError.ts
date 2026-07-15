import { HttpStatus } from '../constants/httpStatus.js';

/**
 * Base application error class.
 * All domain-level errors must extend this class.
 */
export class AppError extends Error {
  public readonly errorCode: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: string = 'ERR_INTERNAL_SERVER_ERROR',
    isOperational = true,
    details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
