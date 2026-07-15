import { prisma } from '../../database/prismaClient.js';
import { doctorRepository } from '../../database/repositories/doctor.repository.js';
import { config } from '../../config/index.js';
import { logger } from '../../common/utils/logger.js';
import { HttpError } from '../../common/errors/HttpError.js';
import { ErrorCode } from '../../common/constants/errorCodes.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/** Exchanges an authorization code for access + refresh tokens. */
async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.GOOGLE_CLIENT_ID ?? '',
      client_secret: config.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: config.GOOGLE_REDIRECT_URI ?? '',
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; refresh_token: string };
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

/** Refreshes a Google access token using the stored refresh token. */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.GOOGLE_CLIENT_ID ?? '',
      client_secret: config.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** Helper to fetch with retry for Google APIs on network or transient errors. */
async function fetchWithRetry(url: string, options: RequestInit, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status >= 500 && i < attempts - 1) {
        logger.warn(`Google API returned transient ${res.status}. Retrying... (${i + 1}/${attempts})`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (i === attempts - 1) throw err;
      logger.warn(`Network error during Google API request. Retrying... (${i + 1}/${attempts})`, { error: err });
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Fetch failed after maximum retry attempts.');
}

export const calendarService = {
  /** Returns the OAuth2 authorization URL. */
  getAuthUrl(doctorUserId: string): string {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_REDIRECT_URI) {
      throw HttpError.badRequest('Google Calendar integration is not configured.', ErrorCode.BAD_REQUEST);
    }
    const params = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID,
      redirect_uri: config.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: doctorUserId,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /** Handles the OAuth callback and stores tokens for the doctor. */
  async handleCallback(code: string, doctorUserId: string): Promise<void> {
    const { accessToken, refreshToken } = await exchangeCode(code);
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw HttpError.notFound('Doctor profile not found.', ErrorCode.NOT_FOUND);

    await doctorRepository.update(doctor.id, {
      googleCalendarToken: accessToken,
      googleRefreshToken: refreshToken,
    });
    logger.info('Google Calendar connected', { doctorId: doctor.id });
  },

  /** Creates a Google Calendar event for an appointment. */
  async createCalendarEvent(appointmentId: string): Promise<void> {
    // Prevent duplicate events by checking if one is already linked
    const existingCalEvent = await prisma.calendarEvent.findUnique({ where: { appointmentId } });
    if (existingCalEvent?.googleEventId) {
      logger.info('Google Calendar event already exists, delegating to update instead', { appointmentId, googleEventId: existingCalEvent.googleEventId });
      return calendarService.updateCalendarEvent(appointmentId);
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: true,
        patient: { include: { user: { select: { email: true } } } },
      },
    });

    if (!appt || !appt.doctor.googleCalendarToken) {
      logger.info('Google Calendar sync skipped — no token', { appointmentId });
      return;
    }

    let accessToken = appt.doctor.googleCalendarToken;

    const event = {
      summary: `Appointment: Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`,
      description: 'Healthcare appointment',
      start: { dateTime: appt.scheduledStart.toISOString(), timeZone: 'UTC' },
      end: { dateTime: appt.scheduledEnd.toISOString(), timeZone: 'UTC' },
      attendees: [{ email: appt.patient.user.email }],
    };

    const tryCreate = async (token: string) =>
      fetchWithRetry(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

    let res = await tryCreate(accessToken);

    // Token expired — refresh and retry
    if (res.status === 401 && appt.doctor.googleRefreshToken) {
      try {
        accessToken = await refreshAccessToken(appt.doctor.googleRefreshToken);
        await doctorRepository.update(appt.doctor.id, { googleCalendarToken: accessToken });
        res = await tryCreate(accessToken);
      } catch (err) {
        logger.error('Failed to refresh Google token', { error: err, doctorId: appt.doctor.id });
        await prisma.calendarEvent.upsert({
          where: { appointmentId },
          update: { syncStatus: 'FAILED' },
          create: { appointmentId, syncStatus: 'FAILED' },
        });
        return;
      }
    }

    if (!res.ok) {
      logger.error('Failed to create Google Calendar event', { status: res.status, appointmentId });
      await prisma.calendarEvent.upsert({
        where: { appointmentId },
        update: { syncStatus: 'FAILED' },
        create: { appointmentId, syncStatus: 'FAILED' },
      });
      return;
    }

    const created = (await res.json()) as { id: string };
    await prisma.calendarEvent.upsert({
      where: { appointmentId },
      update: { googleEventId: created.id, syncStatus: 'IN_SYNC', lastSyncedAt: new Date() },
      create: {
        appointmentId,
        googleEventId: created.id,
        syncStatus: 'IN_SYNC',
        lastSyncedAt: new Date(),
      },
    });

    logger.info('Google Calendar event created', { appointmentId, googleEventId: created.id });
  },

  /** Updates an existing Google Calendar event. */
  async updateCalendarEvent(appointmentId: string): Promise<void> {
    const calEvent = await prisma.calendarEvent.findUnique({ where: { appointmentId } });
    if (!calEvent?.googleEventId) {
      return calendarService.createCalendarEvent(appointmentId);
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: true,
        patient: { include: { user: { select: { email: true } } } },
      },
    });

    if (!appt || !appt.doctor.googleCalendarToken) {
      return;
    }

    let accessToken = appt.doctor.googleCalendarToken;

    const event = {
      summary: `Appointment: Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`,
      description: 'Healthcare appointment',
      start: { dateTime: appt.scheduledStart.toISOString(), timeZone: 'UTC' },
      end: { dateTime: appt.scheduledEnd.toISOString(), timeZone: 'UTC' },
      attendees: [{ email: appt.patient.user.email }],
    };

    const tryUpdate = async (token: string) =>
      fetchWithRetry(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${calEvent.googleEventId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

    let res = await tryUpdate(accessToken);

    // Token expired — refresh and retry
    if (res.status === 401 && appt.doctor.googleRefreshToken) {
      try {
        accessToken = await refreshAccessToken(appt.doctor.googleRefreshToken);
        await doctorRepository.update(appt.doctor.id, { googleCalendarToken: accessToken });
        res = await tryUpdate(accessToken);
      } catch (err) {
        logger.error('Failed to refresh Google token on update', { error: err, doctorId: appt.doctor.id });
        await prisma.calendarEvent.update({
          where: { appointmentId },
          data: { syncStatus: 'FAILED' },
        });
        return;
      }
    }

    if (!res.ok) {
      logger.error('Failed to update Google Calendar event', { status: res.status, appointmentId });
      await prisma.calendarEvent.update({
        where: { appointmentId },
        data: { syncStatus: 'FAILED' },
      });
      return;
    }

    await prisma.calendarEvent.update({
      where: { appointmentId },
      data: { syncStatus: 'IN_SYNC', lastSyncedAt: new Date() },
    });

    logger.info('Google Calendar event updated', { appointmentId, googleEventId: calEvent.googleEventId });
  },

  /** Deletes a Google Calendar event when an appointment is cancelled. */
  async deleteCalendarEvent(appointmentId: string): Promise<void> {
    const calEvent = await prisma.calendarEvent.findUnique({ where: { appointmentId } });
    if (!calEvent?.googleEventId) return;

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true },
    });
    if (!appt?.doctor.googleCalendarToken) return;

    let accessToken = appt.doctor.googleCalendarToken;

    const tryDelete = async (token: string) =>
      fetchWithRetry(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${calEvent.googleEventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

    let res = await tryDelete(accessToken);

    // Token expired — refresh and retry
    if (res.status === 401 && appt.doctor.googleRefreshToken) {
      try {
        accessToken = await refreshAccessToken(appt.doctor.googleRefreshToken);
        await doctorRepository.update(appt.doctor.id, { googleCalendarToken: accessToken });
        res = await tryDelete(accessToken);
      } catch (err) {
        logger.error('Failed to refresh Google token on delete', { error: err, doctorId: appt.doctor.id });
        return;
      }
    }

    if (res.ok || res.status === 404) {
      // 404 means already deleted on Google, which is a success for us
      await prisma.calendarEvent.update({
        where: { appointmentId },
        data: { syncStatus: 'FAILED', googleEventId: null },
      });
      logger.info('Google Calendar event deleted', { appointmentId });
    } else {
      logger.error('Failed to delete Google Calendar event', { status: res.status, appointmentId });
    }
  },
};
