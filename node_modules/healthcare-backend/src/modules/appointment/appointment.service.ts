import { prisma } from '../../database/prismaClient.js';
import { appointmentRepository } from '../../database/repositories/appointment.repository.js';
import { doctorRepository } from '../../database/repositories/doctor.repository.js';
import { patientRepository } from '../../database/repositories/patient.repository.js';
import { authRepository } from '../auth/auth.repository.js';
import { HttpError } from '../../common/errors/HttpError.js';
import { ErrorCode } from '../../common/constants/errorCodes.js';
import { queueEmail } from '../notification/notification.queue.js';
import { calendarService } from '../calendar/calendar.service.js';
import { userRepository } from '../../database/repositories/user.repository.js';

const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const appointmentService = {
  /**
   * Books a slot with a 5-minute hold then confirms.
   * Uses a Prisma transaction with a unique constraint to prevent double-booking.
   */
  async bookAppointment(
    patientUserId: string,
    data: { doctorId: string; scheduledStart: string; symptomDescription?: string },
    ipAddress?: string,
  ) {
    const [patient, doctor] = await Promise.all([
      patientRepository.findByUserId(patientUserId),
      doctorRepository.findById(data.doctorId),
    ]);

    if (!patient) throw HttpError.notFound('Patient profile not found.', ErrorCode.NOT_FOUND);
    if (!doctor) throw HttpError.notFound('Doctor not found.', ErrorCode.NOT_FOUND);

    const start = new Date(data.scheduledStart);
    if (isNaN(start.getTime())) {
      throw HttpError.badRequest('Invalid scheduledStart datetime.', ErrorCode.BAD_REQUEST);
    }
    if (start < new Date()) {
      throw HttpError.badRequest('Cannot book an appointment in the past.', ErrorCode.BAD_REQUEST);
    }

    const end = new Date(start.getTime() + doctor.slotDurationMinutes * 60 * 1000);

    // Expire stale holds first
    await appointmentRepository.expireHolds();

    try {
      // Transactional double-booking prevention
      const appointment = await prisma.$transaction(async (tx) => {
        // Lock check — unique constraint on (doctorId, scheduledStart, active) will catch races
        const existing = await tx.appointment.findFirst({
          where: {
            doctorId: data.doctorId,
            scheduledStart: start,
            active: 'true',
          },
        });
        if (existing) {
          throw HttpError.conflict(
            'This time slot is already booked. Please choose another.',
            ErrorCode.EMAIL_TAKEN,
          );
        }

        return tx.appointment.create({
          data: {
            doctorId: data.doctorId,
            patientId: patient.id,
            scheduledStart: start,
            scheduledEnd: end,
            status: 'BOOKED',
            holdExpiresAt: new Date(Date.now() + HOLD_DURATION_MS),
            active: 'true',
          },
        });
      });

      // Save symptom submission if provided
      if (data.symptomDescription) {
        await prisma.symptomSubmission.create({
          data: {
            appointmentId: appointment.id,
            rawText: data.symptomDescription,
          },
        });
      }

      // Save notification record AND dispatch via BullMQ email worker
      const confirmationBody = `Your appointment with Dr. ${doctor.firstName} ${doctor.lastName} is confirmed for ${start.toLocaleString()}.`;
      await prisma.notification.create({
        data: {
          patientId: patient.id,
          type: 'EMAIL',
          subject: 'Appointment Confirmed',
          body: confirmationBody,
          metadata: { appointmentId: appointment.id },
        },
      });

      // Dispatch email via BullMQ (graceful — does not block booking if queue unavailable)
      const patientUser = await userRepository.findById(patient.userId);
      if (patientUser) {
        queueEmail({
          to: patientUser.email,
          subject: 'Appointment Confirmed',
          body: confirmationBody,
          metadata: { appointmentId: appointment.id },
        }).catch(() => {/* queue failure must not break booking */});
      }

      // Auto-sync to Google Calendar (graceful — does not block booking)
      calendarService.createCalendarEvent(appointment.id).catch(() => {/* sync failure is non-blocking */});

      await authRepository.logAuditEvent({
        userId: patientUserId,
        action: 'APPOINTMENT_BOOKED',
        resourceType: 'Appointment',
        resourceId: appointment.id,
        ipAddress,
      });

      return appointment;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw HttpError.conflict(
          'This time slot was just booked by another user. Please select a different slot.',
          ErrorCode.EMAIL_TAKEN,
        );
      }
      throw error;
    }
  },

  /**
   * Cancels an appointment; only the owning patient or admin can cancel.
   */
  async cancelAppointment(
    appointmentId: string,
    requestingUserId: string,
    reason?: string,
    ipAddress?: string,
  ) {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt) throw HttpError.notFound('Appointment not found.', ErrorCode.NOT_FOUND);

    // Allow patient owner or admin
    const patient = await patientRepository.findByUserId(requestingUserId);
    const isOwner = patient?.id === appt.patientId;
    const isAdmin = !patient; // if no patient profile it could be admin — validated at route level

    if (!isOwner && !isAdmin) {
      throw HttpError.forbidden('You are not allowed to cancel this appointment.');
    }

    if (['CANCELLED', 'COMPLETED', 'NOSHOW'].includes(appt.status)) {
      throw HttpError.badRequest(
        `Cannot cancel an appointment with status: ${appt.status}`,
        ErrorCode.BAD_REQUEST,
      );
    }

    const updated = await appointmentRepository.updateStatus(appointmentId, 'CANCELLED', {
      cancelledAt: new Date(),
      cancelReason: reason ?? 'Cancelled by patient',
      active: null,
    });

    await prisma.notification.create({
      data: {
        patientId: appt.patientId,
        type: 'EMAIL',
        subject: 'Appointment Cancelled',
        body: `Your appointment on ${appt.scheduledStart.toLocaleString()} has been cancelled.`,
        metadata: { appointmentId },
      },
    });

    // Dispatch via BullMQ
    const patientUser = await userRepository.findById(
      (await patientRepository.findById(appt.patientId))?.userId ?? '',
    );
    if (patientUser) {
      queueEmail({
        to: patientUser.email,
        subject: 'Appointment Cancelled',
        body: `Your appointment on ${appt.scheduledStart.toLocaleString()} has been cancelled.`,
        metadata: { appointmentId },
      }).catch(() => {});
    }

    // Remove Google Calendar event
    calendarService.deleteCalendarEvent(appointmentId).catch(() => {});

    await authRepository.logAuditEvent({
      userId: requestingUserId,
      action: 'APPOINTMENT_CANCELLED',
      resourceType: 'Appointment',
      resourceId: appointmentId,
      ipAddress,
    });

    return updated;
  },

  /**
   * Reschedules an appointment to a new time slot.
   */
  async rescheduleAppointment(
    appointmentId: string,
    requestingUserId: string,
    newStart: string,
    ipAddress?: string,
  ) {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt) throw HttpError.notFound('Appointment not found.', ErrorCode.NOT_FOUND);

    const patient = await patientRepository.findByUserId(requestingUserId);
    if (!patient || patient.id !== appt.patientId) {
      throw HttpError.forbidden('You are not allowed to reschedule this appointment.');
    }

    const doctor = await doctorRepository.findById(appt.doctorId);
    if (!doctor) throw HttpError.notFound('Doctor not found.', ErrorCode.NOT_FOUND);

    const start = new Date(newStart);
    if (isNaN(start.getTime()) || start < new Date()) {
      throw HttpError.badRequest('Invalid or past reschedule time.', ErrorCode.BAD_REQUEST);
    }

    const end = new Date(start.getTime() + doctor.slotDurationMinutes * 60 * 1000);

    await appointmentRepository.expireHolds();

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            doctorId: appt.doctorId,
            scheduledStart: start,
            active: 'true',
            id: { not: appointmentId },
          },
        });
        if (conflict) {
          throw HttpError.conflict('That slot is already booked. Please choose another.', ErrorCode.EMAIL_TAKEN);
        }
        return tx.appointment.update({
          where: { id: appointmentId },
          data: { scheduledStart: start, scheduledEnd: end, status: 'RESCHEDULED', active: 'true' },
        });
      });

      await prisma.notification.create({
        data: {
          patientId: patient.id,
          type: 'EMAIL',
          subject: 'Appointment Rescheduled',
          body: `Your appointment has been rescheduled to ${start.toLocaleString()}.`,
          metadata: { appointmentId },
        },
      });

      // Dispatch via BullMQ
      const patientUser = await userRepository.findById(patient.userId);
      if (patientUser) {
        queueEmail({
          to: patientUser.email,
          subject: 'Appointment Rescheduled',
          body: `Your appointment has been rescheduled to ${start.toLocaleString()}.`,
          metadata: { appointmentId },
        }).catch(() => {});
      }

      // Re-sync calendar event
      calendarService.updateCalendarEvent(appointmentId).catch(() => {});

      await authRepository.logAuditEvent({
        userId: requestingUserId,
        action: 'APPOINTMENT_RESCHEDULED',
        resourceType: 'Appointment',
        resourceId: appointmentId,
        ipAddress,
      });

      return updated;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw HttpError.conflict(
          'This time slot was just booked by another user. Please select a different slot.',
          ErrorCode.EMAIL_TAKEN,
        );
      }
      throw error;
    }
  },

  async getPatientHistory(patientUserId: string, page = 1, limit = 20) {
    const patient = await patientRepository.findByUserId(patientUserId);
    if (!patient) throw HttpError.notFound('Patient profile not found.', ErrorCode.NOT_FOUND);
    const [appointments, total] = await appointmentRepository.findForPatient(patient.id, page, limit);
    return { appointments, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getDoctorSchedule(doctorUserId: string, date?: string) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw HttpError.notFound('Doctor profile not found.', ErrorCode.NOT_FOUND);
    const d = date ? new Date(date) : undefined;
    return appointmentRepository.findForDoctor(doctor.id, d);
  },

  async getById(id: string) {
    const appt = await appointmentRepository.findById(id);
    if (!appt) throw HttpError.notFound('Appointment not found.', ErrorCode.NOT_FOUND);
    return appt;
  },

  async holdSlot(
    patientUserId: string,
    data: { doctorId: string; scheduledStart: string },
    ipAddress?: string,
  ) {
    const patient = await patientRepository.findByUserId(patientUserId);
    if (!patient) throw HttpError.notFound('Patient profile not found.', ErrorCode.NOT_FOUND);

    const doctor = await doctorRepository.findById(data.doctorId);
    if (!doctor) throw HttpError.notFound('Doctor profile not found.', ErrorCode.NOT_FOUND);

    const start = new Date(data.scheduledStart);
    if (isNaN(start.getTime()) || start < new Date()) {
      throw HttpError.badRequest('Invalid or past start time.', ErrorCode.BAD_REQUEST);
    }
    const end = new Date(start.getTime() + doctor.slotDurationMinutes * 60 * 1000);

    // Expire stale holds first
    await appointmentRepository.expireHolds();

    try {
      const appointment = await prisma.$transaction(async (tx) => {
        const existing = await tx.appointment.findFirst({
          where: {
            doctorId: data.doctorId,
            scheduledStart: start,
            active: 'true',
          },
        });
        if (existing) {
          throw HttpError.conflict(
            'This time slot is already booked. Please choose another.',
            ErrorCode.EMAIL_TAKEN,
          );
        }

        return tx.appointment.create({
          data: {
            doctorId: data.doctorId,
            patientId: patient.id,
            scheduledStart: start,
            scheduledEnd: end,
            status: 'PENDING_HOLD',
            holdExpiresAt: new Date(Date.now() + HOLD_DURATION_MS),
            active: 'true',
          },
        });
      });

      await authRepository.logAuditEvent({
        userId: patientUserId,
        action: 'APPOINTMENT_HOLD',
        resourceType: 'Appointment',
        resourceId: appointment.id,
        ipAddress,
      });

      return appointment;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw HttpError.conflict(
          'This time slot was just booked by another user. Please select a different slot.',
          ErrorCode.EMAIL_TAKEN,
        );
      }
      throw error;
    }
  },

  async confirmBooking(
    appointmentId: string,
    patientUserId: string,
    data: { symptomDescription?: string },
    ipAddress?: string,
  ) {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt) throw HttpError.notFound('Appointment hold not found.', ErrorCode.NOT_FOUND);

    const patient = await patientRepository.findByUserId(patientUserId);
    if (!patient || patient.id !== appt.patientId) {
      throw HttpError.forbidden('You are not allowed to confirm this appointment.');
    }

    if (appt.status !== 'PENDING_HOLD') {
      throw HttpError.badRequest(
        `Cannot confirm appointment with status: ${appt.status}`,
        ErrorCode.BAD_REQUEST,
      );
    }

    if (appt.holdExpiresAt && appt.holdExpiresAt < new Date()) {
      // Clear active and set status to cancelled
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED', cancelReason: 'Hold expired', active: null },
      });
      throw HttpError.badRequest('Hold has expired. Please reserve the slot again.', ErrorCode.BAD_REQUEST);
    }

    const doctor = await doctorRepository.findById(appt.doctorId);
    if (!doctor) throw HttpError.notFound('Doctor profile not found.', ErrorCode.NOT_FOUND);

    // Update status to BOOKED
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'BOOKED',
        holdExpiresAt: null,
      },
    });

    // Save symptom submission if provided
    if (data.symptomDescription) {
      await prisma.symptomSubmission.create({
        data: {
          appointmentId: appointment.id,
          rawText: data.symptomDescription,
        },
      });
    }

    // Save notification record AND dispatch via BullMQ email worker
    const confirmationBody = `Your appointment with Dr. ${doctor.firstName} ${doctor.lastName} is confirmed for ${appt.scheduledStart.toLocaleString()}.`;
    await prisma.notification.create({
      data: {
        patientId: patient.id,
        type: 'EMAIL',
        subject: 'Appointment Confirmed',
        body: confirmationBody,
        metadata: { appointmentId: appointment.id },
      },
    });

    // Dispatch email via BullMQ (graceful)
    const patientUser = await userRepository.findById(patient.userId);
    if (patientUser) {
      queueEmail({
        to: patientUser.email,
        subject: 'Appointment Confirmed',
        body: confirmationBody,
        metadata: { appointmentId: appointment.id },
      }).catch(() => {});
    }

    // Auto-sync to Google Calendar (graceful)
    calendarService.createCalendarEvent(appointment.id).catch(() => {});

    await authRepository.logAuditEvent({
      userId: patientUserId,
      action: 'APPOINTMENT_CONFIRMED',
      resourceType: 'Appointment',
      resourceId: appointment.id,
      ipAddress,
    });

    return appointment;
  },
};
