"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailRequestSchema = exports.resetPasswordRequestSchema = exports.forgotPasswordRequestSchema = exports.loginRequestSchema = exports.registerRequestSchema = exports.passwordSchema = exports.baseUserSchema = exports.UserRole = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Role Constants
// ---------------------------------------------------------------------------
exports.UserRole = {
    PATIENT: 'PATIENT',
    DOCTOR: 'DOCTOR',
    ADMIN: 'ADMIN',
};
// ---------------------------------------------------------------------------
// Base Schemas
// ---------------------------------------------------------------------------
exports.baseUserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    role: zod_1.z.nativeEnum(exports.UserRole),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// ---------------------------------------------------------------------------
// Password schema (reused in register & reset)
// ---------------------------------------------------------------------------
exports.passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');
// ---------------------------------------------------------------------------
// Auth Request Schemas
// ---------------------------------------------------------------------------
exports.registerRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email('Invalid email address'),
    password: exports.passwordSchema,
    confirmPassword: zod_1.z.string(),
    firstName: zod_1.z.string().min(1, 'First name is required').max(100),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100),
    phoneNumber: zod_1.z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
        .optional()
        .or(zod_1.z.literal('')),
    dob: zod_1.z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
        .refine((val) => new Date(val) < new Date(), 'Date of birth must be in the past'),
    termsAccepted: zod_1.z.boolean().refine((val) => val === true, 'You must accept the terms'),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
exports.loginRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
    rememberMe: zod_1.z.boolean().optional().default(false),
});
exports.forgotPasswordRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.resetPasswordRequestSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    password: exports.passwordSchema,
    confirmPassword: zod_1.z.string(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
exports.verifyEmailRequestSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Verification token is required'),
});
