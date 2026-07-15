import { z } from 'zod';
export declare const UserRole: {
    readonly PATIENT: "PATIENT";
    readonly DOCTOR: "DOCTOR";
    readonly ADMIN: "ADMIN";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const baseUserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodNativeEnum<{
        readonly PATIENT: "PATIENT";
        readonly DOCTOR: "DOCTOR";
        readonly ADMIN: "ADMIN";
    }>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    role: "PATIENT" | "DOCTOR" | "ADMIN";
    createdAt: Date;
    updatedAt: Date;
}, {
    id: string;
    email: string;
    role: "PATIENT" | "DOCTOR" | "ADMIN";
    createdAt: Date;
    updatedAt: Date;
}>;
export type BaseUser = z.infer<typeof baseUserSchema>;
export declare const passwordSchema: z.ZodString;
export declare const registerRequestSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phoneNumber: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    dob: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    termsAccepted: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    dob: string;
    termsAccepted: boolean;
    phoneNumber?: string | undefined;
}, {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    dob: string;
    termsAccepted: boolean;
    phoneNumber?: string | undefined;
}>, {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    dob: string;
    termsAccepted: boolean;
    phoneNumber?: string | undefined;
}, {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    dob: string;
    termsAccepted: boolean;
    phoneNumber?: string | undefined;
}>;
export declare const loginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    rememberMe: boolean;
}, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}>;
export declare const forgotPasswordRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordRequestSchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    confirmPassword: string;
    token: string;
}, {
    password: string;
    confirmPassword: string;
    token: string;
}>, {
    password: string;
    confirmPassword: string;
    token: string;
}, {
    password: string;
    confirmPassword: string;
    token: string;
}>;
export declare const verifyEmailRequestSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type RegisterInput = RegisterRequest;
export type LoginInput = LoginRequest;
export type ForgotPasswordInput = ForgotPasswordRequest;
export type ResetPasswordInput = ResetPasswordRequest;
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
    details?: Array<{
        field?: string;
        message: string;
    }>;
}
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
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
