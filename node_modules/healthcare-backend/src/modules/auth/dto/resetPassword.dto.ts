/**
 * Data Transfer Object for the reset-password endpoint.
 * Uses `password` (matched with the shared schema field name).
 */
export interface ResetPasswordDto {
  token: string;
  password: string;
  confirmPassword: string;
}
