import { AppError } from './AppError.js';
import { ErrorCode, type ErrorCodeValue } from '../constants/errorCodes.js';
import { HttpStatus, type HttpStatusCode } from '../constants/httpStatus.js';

/**
 * HTTP-aware error factory.
 * Use the static helpers to throw clean, consistent HTTP errors from services.
 */
export class HttpError extends AppError {
  constructor(
    message: string,
    statusCode: HttpStatusCode,
    errorCode: ErrorCodeValue = ErrorCode.INTERNAL_ERROR,
    details?: Array<{ field?: string; message: string }>,
  ) {
    super(message, statusCode, errorCode, true, details);
  }

  /** 400 Bad Request */
  static badRequest(
    message = 'Bad request.',
    errorCode: ErrorCodeValue = ErrorCode.BAD_REQUEST,
    details?: Array<{ field?: string; message: string }>,
  ): HttpError {
    return new HttpError(message, HttpStatus.BAD_REQUEST, errorCode, details);
  }

  /** 401 Unauthorized */
  static unauthorized(
    message = 'Authentication required.',
    errorCode: ErrorCodeValue = ErrorCode.UNAUTHORIZED,
  ): HttpError {
    return new HttpError(message, HttpStatus.UNAUTHORIZED, errorCode);
  }

  /** 403 Forbidden */
  static forbidden(
    message = 'You do not have permission to access this resource.',
    errorCode: ErrorCodeValue = ErrorCode.FORBIDDEN,
  ): HttpError {
    return new HttpError(message, HttpStatus.FORBIDDEN, errorCode);
  }

  /** 404 Not Found */
  static notFound(
    message = 'The requested resource was not found.',
    errorCode: ErrorCodeValue = ErrorCode.NOT_FOUND,
  ): HttpError {
    return new HttpError(message, HttpStatus.NOT_FOUND, errorCode);
  }

  /** 409 Conflict */
  static conflict(
    message: string,
    errorCode: ErrorCodeValue = ErrorCode.EMAIL_TAKEN,
  ): HttpError {
    return new HttpError(message, HttpStatus.CONFLICT, errorCode);
  }

  /** 429 Too Many Requests */
  static tooManyRequests(message = 'Too many requests. Please try again later.'): HttpError {
    return new HttpError(message, HttpStatus.TOO_MANY_REQUESTS, ErrorCode.TOO_MANY_REQUESTS);
  }

  /** 500 Internal Server Error */
  static internal(message = 'An unexpected error occurred. Please try again later.'): HttpError {
    return new HttpError(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR);
  }
}
