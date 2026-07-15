import { z } from 'zod';

// ---------------------------------------------------------------------------
// Role Constants
// ---------------------------------------------------------------------------

export const UserRole = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ---------------------------------------------------------------------------
// Base Schemas
// ---------------------------------------------------------------------------

export const baseUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BaseUser = z.infer<typeof baseUserSchema>;

// ---------------------------------------------------------------------------
// Password schema (reused in register & reset)
// ---------------------------------------------------------------------------

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

// ---------------------------------------------------------------------------
// Auth Request Schemas
// ---------------------------------------------------------------------------

export const registerRequestSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
      .optional()
      .or(z.literal('')),
    dob: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
      .refine((val) => new Date(val) < new Date(), 'Date of birth must be in the past'),
    termsAccepted: z.boolean().refine((val) => val === true, 'You must accept the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordRequestSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// ---------------------------------------------------------------------------
// Auth Request Types (inferred from schemas)
// ---------------------------------------------------------------------------

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

// Legacy aliases kept for frontend usage
export type RegisterInput = RegisterRequest;
export type LoginInput = LoginRequest;
export type ForgotPasswordInput = ForgotPasswordRequest;
export type ResetPasswordInput = ResetPasswordRequest;

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  errorCode: string;
  message: string;
  timestamp: string;
  correlationId?: string;
  details?: Array<{ field?: string; message: string }>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Auth Response Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginResponseData {
  accessToken: string;
  mfaRequired: boolean;
  user: Pick<AuthUser, 'id' | 'role'>;
}

export interface RegisterResponseData {
  userId: string;
}
