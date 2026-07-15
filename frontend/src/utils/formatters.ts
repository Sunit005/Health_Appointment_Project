import axios from 'axios';

/**
 * Extracts a user-friendly error message from an unknown thrown value.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (data?.error?.message) {
      return String(data.error.message);
    }
    if (data?.message) {
      return String(data.message);
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Formats a Date or ISO string to a readable locale string.
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
