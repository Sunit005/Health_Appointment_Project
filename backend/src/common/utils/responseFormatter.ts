/**
 * Builds a standardized success response envelope.
 */
export function formatSuccess<T>(
  data: T,
  message?: string,
): { success: true; data: T; message?: string; timestamp: string } {
  return {
    success: true as const,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds a standardized error response envelope.
 * Stack traces and internal details are never included.
 */
export function formatError(
  errorCode: string,
  message: string,
  correlationId?: string,
  details?: Array<{ field?: string; message: string }>,
): {
  success: false;
  errorCode: string;
  message: string;
  timestamp: string;
  correlationId?: string;
  details?: Array<{ field?: string; message: string }>;
} {
  return {
    success: false as const,
    errorCode,
    message,
    timestamp: new Date().toISOString(),
    ...(correlationId && { correlationId }),
    ...(details?.length && { details }),
  };
}
