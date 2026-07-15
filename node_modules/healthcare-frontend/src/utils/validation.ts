import * as shared from '@healthcare/shared';

export const registerSchema = shared.registerRequestSchema;
export const loginSchema = shared.loginRequestSchema;
export const forgotPasswordSchema = shared.forgotPasswordRequestSchema;
export const resetPasswordSchema = shared.resetPasswordRequestSchema;
export const verifyEmailSchema = shared.verifyEmailRequestSchema;
export const passwordSchema = shared.passwordSchema;

export type RegisterInput = shared.RegisterInput;
export type LoginInput = shared.LoginInput;
export type ForgotPasswordInput = shared.ForgotPasswordInput;
export type ResetPasswordInput = shared.ResetPasswordInput;
