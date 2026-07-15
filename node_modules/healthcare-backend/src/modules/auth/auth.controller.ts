import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';
import { HttpStatus } from '../../common/constants/httpStatus.js';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
} from '../../common/utils/cookie.util.js';
import { HttpError } from '../../common/errors/HttpError.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ForgotPasswordDto } from './dto/forgotPassword.dto.js';
import type { ResetPasswordDto } from './dto/resetPassword.dto.js';

/**
 * Auth controller — translates HTTP request/response into service calls.
 * No business logic here; delegate everything to `authService`.
 */
export const authController = {
  /**
   * POST /api/v1/auth/register
   * Registers a new patient account.
   */
  async register(req: Request, res: Response): Promise<void> {
    const dto = req.body as RegisterDto;
    const ipAddress = req.ip ?? req.socket.remoteAddress;

    const result = await authService.register(dto, ipAddress);

    res.status(HttpStatus.CREATED).json(
      formatSuccess(
        { userId: result.userId },
        'Registration successful. Please check your email to verify your account.',
      ),
    );
  },

  /**
   * POST /api/v1/auth/login
   * Authenticates credentials and issues JWT tokens.
   */
  async login(req: Request, res: Response): Promise<void> {
    const dto = req.body as LoginDto;
    const ipAddress = req.ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { tokens, user } = await authService.login(dto, {
      userAgent,
      ipAddress,
      correlationId: req.correlationId,
    });

    // Store refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.status(HttpStatus.OK).json(
      formatSuccess({
        accessToken: tokens.accessToken,
        mfaRequired: false,
        user: { id: user.id, role: user.role },
      }),
    );
  },

  /**
   * POST /api/v1/auth/logout
   * Terminates the current session.
   */
  async logout(req: Request, res: Response): Promise<void> {
    const sessionId = req.user?.sessionId;
    const userId = req.user?.id;

    if (sessionId && userId) {
      const ipAddress = req.ip ?? req.socket.remoteAddress;
      await authService.logout(sessionId, userId, ipAddress);
    }

    clearRefreshTokenCookie(res);

    res.status(HttpStatus.OK).json(
      formatSuccess(null, 'You have been logged out successfully.'),
    );
  },

  /**
   * POST /api/v1/auth/refresh
   * Rotates the refresh token and issues a new access token.
   */
  async refresh(req: Request, res: Response): Promise<void> {
    // Prefer cookie over body for browser clients
    const refreshToken =
      readRefreshTokenCookie(req.cookies as Record<string, string>) ??
      (req.body as { refreshToken?: string }).refreshToken;

    if (!refreshToken) {
      throw HttpError.unauthorized('Refresh token is required.');
    }

    const ipAddress = req.ip ?? req.socket.remoteAddress;
    const tokens = await authService.refresh(refreshToken, ipAddress);

    // Rotate cookie with new token
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.status(HttpStatus.OK).json(
      formatSuccess({ accessToken: tokens.accessToken }),
    );
  },

  /**
   * POST /api/v1/auth/forgot-password
   * Initiates the password reset flow.
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const dto = req.body as ForgotPasswordDto;
    const ipAddress = req.ip ?? req.socket.remoteAddress;

    await authService.forgotPassword(dto.email, ipAddress);

    // Always return the same response to prevent email enumeration
    res.status(HttpStatus.OK).json(
      formatSuccess(
        null,
        'If an account with that email exists, a password reset link has been sent.',
      ),
    );
  },

  /**
   * POST /api/v1/auth/reset-password
   * Validates the reset token and updates the password.
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body as ResetPasswordDto;
    const ipAddress = req.ip ?? req.socket.remoteAddress;

    await authService.resetPassword(token, password, ipAddress);

    res.status(HttpStatus.OK).json(
      formatSuccess(null, 'Your password has been reset successfully. Please log in with your new password.'),
    );
  },

  /**
   * POST /api/v1/auth/verify-email
   * Confirms an email verification token.
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.body as { token: string };
    const ipAddress = req.ip ?? req.socket.remoteAddress;

    await authService.verifyEmail(token, ipAddress);

    res.status(HttpStatus.OK).json(
      formatSuccess(null, 'Your email address has been verified successfully.'),
    );
  },
};
