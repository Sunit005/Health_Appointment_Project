import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { registerSchema } from './validation/register.validation.js';
import { loginSchema } from './validation/login.validation.js';
import { forgotPasswordSchema } from './validation/forgotPassword.validation.js';
import { resetPasswordSchema } from './validation/resetPassword.validation.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Registers a new patient account.
 */
router.post('/register', validate(registerSchema), asyncHandler(authController.register));

/**
 * POST /api/v1/auth/login
 * Authenticates credentials and issues tokens.
 */
router.post('/login', validate(loginSchema), asyncHandler(authController.login));

/**
 * POST /api/v1/auth/logout
 * Logs out the authenticated user (requires valid access token).
 */
router.post('/logout', authenticate, asyncHandler(authController.logout));

/**
 * POST /api/v1/auth/refresh
 * Rotates the refresh token and issues a new access token.
 */
router.post('/refresh', asyncHandler(authController.refresh));

/**
 * POST /api/v1/auth/forgot-password
 * Initiates the password reset flow.
 */
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));

/**
 * POST /api/v1/auth/reset-password
 * Validates reset token and updates the password.
 */
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(authController.resetPassword));

/**
 * POST /api/v1/auth/verify-email
 * Confirms an email address using a verification token.
 */
router.post('/verify-email', asyncHandler(authController.verifyEmail));

export default router;
