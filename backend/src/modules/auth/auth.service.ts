import { UserRole } from '@healthcare/shared';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { userRepository } from '../../database/repositories/user.repository.js';
import { sessionRepository } from '../../database/repositories/session.repository.js';
import { refreshTokenRepository } from '../../database/repositories/refreshToken.repository.js';
import { authRepository } from './auth.repository.js';
import { hashPassword, verifyPassword } from '../../common/utils/password.util.js';
import { signAccessToken } from '../../common/utils/jwt.util.js';
import {
  generateRefreshToken,
  parseRefreshToken,
  hashRefreshToken,
  generateFamilyId,
} from '../../common/utils/refreshToken.util.js';
import { generateSecureToken } from '../../common/utils/security.util.js';
import { HttpError } from '../../common/errors/HttpError.js';
import { ErrorCode } from '../../common/constants/errorCodes.js';
import { logger } from '../../common/utils/logger.js';
import type { AuthTokenPair } from '../../common/types/auth.types.js';

/** Session expiry: 7 days, matching the refresh token TTL */
const SESSION_TTL_DAYS = 7;

/** Password reset link valid for 1 hour */
const PASSWORD_RESET_TTL_HOURS = 1;

/** Email verification link valid for 24 hours */
const EMAIL_VERIFY_TTL_HOURS = 24;

function sessionExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_TTL_DAYS);
  return d;
}

export const authService = {
  /**
   * Registers a new patient account.
   *
   * @param dto - Validated registration payload.
   * @param ipAddress - Client IP for audit logging.
   * @returns The newly created user's UUID.
   */
  async register(dto: RegisterDto, ipAddress?: string): Promise<{ userId: string }> {
    // Check for duplicate email
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) {
      throw HttpError.conflict('This email address is already registered.', ErrorCode.EMAIL_TAKEN);
    }

    const passwordHash = await hashPassword(dto.password);
    const emailVerifyToken = generateSecureToken(32);
    const emailVerifyTokenExpires = new Date();
    emailVerifyTokenExpires.setHours(emailVerifyTokenExpires.getHours() + EMAIL_VERIFY_TTL_HOURS);

    const user = await userRepository.create({
      email: dto.email,
      passwordHash,
      role: 'PATIENT' as const,
      emailVerifyToken,
      emailVerifyTokenExpires,
    });

    // Create linked patient profile
    await authRepository.createPatientProfile({
      userId: user.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dob: new Date(dto.dob),
      phoneNumber: dto.phoneNumber,
    });

    await authRepository.logAuditEvent({
      userId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress,
    });

    logger.info('New patient registered', { userId: user.id, email: user.email });

    // In production, an email would be dispatched here via BullMQ.
    // For now, the token is available in the database.

    return { userId: user.id };
  },

  /**
   * Authenticates a user and issues a JWT access token + refresh token pair.
   *
   * @param dto - Validated login credentials.
   * @param options - Request metadata for session/audit records.
   * @returns The token pair and basic user info.
   */
  async login(
    dto: LoginDto,
    options: { userAgent?: string; ipAddress?: string; correlationId?: string },
  ): Promise<{ tokens: AuthTokenPair; user: { id: string; email: string; role: UserRole } }> {
    const user = await userRepository.findByEmail(dto.email);

    // Guard: use a constant-time-like approach (always hash even if user not found)
    if (!user) {
      // still verify a dummy hash to prevent timing-based enumeration
      await verifyPassword('$argon2id$v=19$m=65536,t=3,p=4$dummyhash', dto.password).catch(() => null);
      throw HttpError.unauthorized('The email or password you entered is incorrect.', ErrorCode.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      await authRepository.logAuditEvent({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: options.ipAddress,
        correlationId: options.correlationId,
      });
      throw HttpError.unauthorized('The email or password you entered is incorrect.', ErrorCode.INVALID_CREDENTIALS);
    }

    // Create a new session
    const session = await sessionRepository.create({
      userId: user.id,
      expiresAt: sessionExpiresAt(),
      userAgent: options.userAgent,
      ipAddress: options.ipAddress,
    });

    // Issue refresh token (new family for every new login)
    const familyId = generateFamilyId();
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken(user.id, session.id, familyId);

    await refreshTokenRepository.create({
      tokenHash,
      userId: user.id,
      sessionId: session.id,
      familyId,
      expiresAt,
    });

    // Issue access token
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      sessionId: session.id,
    });

    // Update last login timestamp
    await userRepository.update(user.id, { lastLoginAt: new Date() });

    await authRepository.logAuditEvent({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: options.ipAddress,
      correlationId: options.correlationId,
    });

    logger.info('User logged in', { userId: user.id, sessionId: session.id });

    return {
      tokens: { accessToken, refreshToken },
      user: { id: user.id, email: user.email, role: user.role as UserRole },
    };
  },

  /**
   * Invalidates the current session and revokes the refresh token.
   *
   * @param sessionId - The session UUID to terminate.
   * @param userId - The user performing the logout (for audit logs).
   * @param ipAddress - Client IP for audit logging.
   */
  async logout(sessionId: string, userId: string, ipAddress?: string): Promise<void> {
    await sessionRepository.deactivate(sessionId);
    await refreshTokenRepository.revokeAllForUser(userId);

    await authRepository.logAuditEvent({
      userId,
      action: 'LOGOUT',
      resourceType: 'Session',
      resourceId: sessionId,
      ipAddress,
    });

    logger.info('User logged out', { userId, sessionId });
  },

  /**
   * Rotates a refresh token and issues a new access + refresh token pair.
   * Implements Refresh Token Rotation (RTR) with reuse detection.
   *
   * @param incomingRefreshToken - The plain-text refresh token from the cookie.
   * @param ipAddress - Client IP for audit logging.
   * @returns A new token pair.
   */
  async refresh(
    incomingRefreshToken: string,
    ipAddress?: string,
  ): Promise<AuthTokenPair> {
    const payload = parseRefreshToken(incomingRefreshToken);
    const tokenHash = hashRefreshToken(incomingRefreshToken);

    const storedToken = await refreshTokenRepository.findByHash(tokenHash);

    if (!storedToken) {
      throw HttpError.unauthorized('Invalid refresh token.', ErrorCode.TOKEN_INVALID);
    }

    if (storedToken.isRevoked) {
      // Token reuse detected — revoke entire family immediately
      await refreshTokenRepository.revokeFamily(storedToken.familyId);
      await sessionRepository.deactivate(storedToken.sessionId);

      logger.warn('Refresh token reuse detected — family revoked', {
        userId: payload.sub,
        familyId: storedToken.familyId,
        ipAddress,
      });

      await authRepository.logAuditEvent({
        userId: payload.sub,
        action: 'TOKEN_REUSE_DETECTED',
        resourceType: 'RefreshToken',
        resourceId: storedToken.id,
        ipAddress,
      });

      throw HttpError.unauthorized('Session security violation detected. Please log in again.', ErrorCode.TOKEN_REUSE);
    }

    if (storedToken.isUsed) {
      throw HttpError.unauthorized('This refresh token has already been used. Please log in again.', ErrorCode.TOKEN_INVALID);
    }

    if (new Date() > storedToken.expiresAt) {
      throw HttpError.unauthorized('Your session has expired. Please log in again.', ErrorCode.TOKEN_EXPIRED);
    }

    // Validate session is still active
    const session = await sessionRepository.findActiveById(storedToken.sessionId);
    if (!session) {
      throw HttpError.unauthorized('Your session is no longer active. Please log in again.', ErrorCode.UNAUTHORIZED);
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw HttpError.unauthorized('User account not found.', ErrorCode.USER_NOT_FOUND);
    }

    // Mark old token as used (RTR)
    await refreshTokenRepository.markUsed(storedToken.id);

    // Issue new refresh token in the same family
    const {
      token: newRefreshToken,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    } = generateRefreshToken(user.id, session.id, storedToken.familyId);

    await refreshTokenRepository.create({
      tokenHash: newTokenHash,
      userId: user.id,
      sessionId: session.id,
      familyId: storedToken.familyId,
      expiresAt: newExpiresAt,
    });

    // Issue new access token
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      sessionId: session.id,
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  /**
   * Initiates a password reset flow by generating a secure reset token.
   * Always responds with a generic success message to prevent email enumeration.
   *
   * @param email - The email address to send the reset link to.
   * @param ipAddress - Client IP for audit logging.
   */
  async forgotPassword(email: string, ipAddress?: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Silently return — never reveal whether an email is registered
      logger.info('Password reset requested for non-existent email', { ipAddress });
      return;
    }

    const resetToken = generateSecureToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_TTL_HOURS);

    await userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetTokenExpires: expiresAt,
    });

    await authRepository.logAuditEvent({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress,
    });

    // In production, dispatch reset email via BullMQ here.
    logger.info('Password reset token generated', { userId: user.id });
  },

  /**
   * Validates a reset token and updates the user's password.
   *
   * @param token - The plain-text reset token from the URL.
   * @param newPassword - The new password (plain text — will be hashed).
   * @param ipAddress - Client IP for audit logging.
   */
  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    const user = await userRepository.findByResetToken(token);

    if (!user) {
      throw HttpError.badRequest(
        'This password reset link is invalid or has expired.',
        ErrorCode.PASSWORD_RESET_INVALID,
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await userRepository.update(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    });

    // Invalidate all existing sessions for security
    await sessionRepository.deactivateAllForUser(user.id);
    await refreshTokenRepository.revokeAllForUser(user.id);

    await authRepository.logAuditEvent({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress,
    });

    logger.info('Password reset completed', { userId: user.id });
  },

  /**
   * Verifies a user's email address using the emailed verification token.
   *
   * @param token - The email verification token.
   * @param ipAddress - Client IP for audit logging.
   */
  async verifyEmail(token: string, ipAddress?: string): Promise<void> {
    const user = await userRepository.findByEmailVerifyToken(token);

    if (!user) {
      throw HttpError.badRequest(
        'This email verification link is invalid or has expired.',
        ErrorCode.TOKEN_INVALID,
      );
    }

    await userRepository.update(user.id, {
      isEmailVerified: true,
      emailVerifyToken: null,
      emailVerifyTokenExpires: null,
    });

    await authRepository.logAuditEvent({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress,
    });

    logger.info('Email verified', { userId: user.id });
  },
};
