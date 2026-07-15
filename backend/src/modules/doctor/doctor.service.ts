import { prisma } from '../../database/prismaClient.js';
import { doctorRepository, type DoctorSearchParams } from '../../database/repositories/doctor.repository.js';
import { HttpError } from '../../common/errors/HttpError.js';
import { ErrorCode } from '../../common/constants/errorCodes.js';
import { authRepository } from '../auth/auth.repository.js';
import { queueEmail } from '../notification/notification.queue.js';
import { patientRepository } from '../../database/repositories/patient.repository.js';
import { calendarService } from '../calendar/calendar.service.js';
import { config } from '../../config/index.js';

export const doctorService = {
  /**
   * Lists doctors with optional filtering, pagination, and sorting.
   */
  async listDoctors(params: DoctorSearchParams) {
    return doctorRepository.search(params);
  },

  /**
   * Returns a single doctor's public profile.
   */
  async getDoctorById(id: string) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) throw HttpError.notFound('Doctor not found.', ErrorCode.NOT_FOUND);
    return doctor;
  },

  /**
   * Returns available time slots for a doctor on a specific date.
   * Slots are generated from working hours minus booked appointments.
   */
  async getAvailableSlots(doctorId: string, dateStr: string) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw HttpError.notFound('Doctor not found.', ErrorCode.NOT_FOUND);

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw HttpError.badRequest('Invalid date format. Use YYYY-MM-DD.', ErrorCode.BAD_REQUEST);
    }

    const dayOfWeek = date.getDay();
    const workingHour = await prisma.doctorWorkingHour.findFirst({
      where: { doctorId, dayOfWeek, isActive: true },
    });

    if (!workingHour) return { slots: [], message: 'Doctor is not available on this day.' };

    // Check for approved leaves covering this date
    const leaveCovering = await prisma.doctorLeave.findFirst({
      where: {
        doctorId,
        status: 'APPROVED',
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
    if (leaveCovering) return { slots: [], message: 'Doctor is on approved leave this day.' };

    const slotDuration = workingHour.slotDurationMinutes;
    const [startHour, startMin] = workingHour.startTime.split(':').map(Number);
    const [endHour, endMin] = workingHour.endTime.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(startHour, startMin, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMin, 0, 0);

    // Fetch booked appointments in that range
    const booked = await prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledStart: { gte: dayStart, lt: dayEnd },
        status: { notIn: ['CANCELLED', 'NOSHOW'] },
      },
      select: { scheduledStart: true, scheduledEnd: true },
    });
    const bookedTimes = new Set(booked.map((a) => a.scheduledStart.getTime()));

    const slots: { start: string; end: string; available: boolean }[] = [];
    const cursor = new Date(dayStart);

    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + slotDuration * 60 * 1000);
      if (slotEnd > dayEnd) break;

      const isPast = cursor < new Date();
      const isBooked = bookedTimes.has(cursor.getTime());

      slots.push({
        start: cursor.toISOString(),
        end: slotEnd.toISOString(),
        available: !isPast && !isBooked,
      });
      cursor.setTime(cursor.getTime() + slotDuration * 60 * 1000);
    }

    return { slots, doctorId, date: dateStr };
  },

  /**
   * Sets working hours for a doctor (upsert by dayOfWeek).
   */
  async setWorkingHours(
    doctorId: string,
    data: { dayOfWeek: number; startTime: string; endTime: string; slotDurationMinutes?: number },
  ) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw HttpError.notFound('Doctor not found.', ErrorCode.NOT_FOUND);

    return prisma.doctorWorkingHour.upsert({
      where: { uq_doctor_day_start: { doctorId, dayOfWeek: data.dayOfWeek, startTime: data.startTime } },
      update: {
        endTime: data.endTime,
        slotDurationMinutes: data.slotDurationMinutes ?? 30,
        isActive: true,
      },
      create: {
        doctorId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDurationMinutes: data.slotDurationMinutes ?? 30,
      },
    });
  },

  /**
   * Submits a leave request for a doctor.
  /**
   * Helper to detect conflicting appointments.
   */
  async detectConflicts(doctorId: string, start: Date, end: Date) {
    return prisma.appointment.findMany({
      where: {
        doctorId,
        status: { notIn: ['CANCELLED', 'NOSHOW'] },
        OR: [
          { scheduledStart: { gte: start, lt: end } },
          { scheduledEnd: { gt: start, lte: end } },
          { scheduledStart: { lte: start }, scheduledEnd: { gte: end } },
        ],
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },

  /**
   * Submits a leave request for a doctor.
   * If there are conflicting appointments, returns status CONFLICTS_DETECTED to prompt confirmation.
   * If confirm is true or no conflicts exist, approves leave immediately and cancels appointments.
   */
  async requestLeave(
    doctorId: string,
    data: { startDate: string; endDate: string; reason?: string; confirm?: boolean },
    ipAddress?: string,
  ) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw HttpError.notFound('Doctor not found.', ErrorCode.NOT_FOUND);

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end < start) {
      throw HttpError.badRequest('End date must be after start date.', ErrorCode.BAD_REQUEST);
    }

    // Check conflicts
    const conflicts = await doctorService.detectConflicts(doctorId, start, end);

    if (conflicts.length > 0 && !data.confirm) {
      return {
        status: 'CONFLICTS_DETECTED',
        conflictsCount: conflicts.length,
        conflicts: conflicts.map((c) => ({
          id: c.id,
          scheduledStart: c.scheduledStart,
          scheduledEnd: c.scheduledEnd,
          patientName: `${c.patient.firstName} ${c.patient.lastName}`,
        })),
      };
    }

    // Atomically execute leave creation, appointment cancellation, notifications, audit log
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create approved leave record
      const leave = await tx.doctorLeave.create({
        data: {
          doctorId,
          startDate: start,
          endDate: end,
          reason: data.reason,
          status: 'APPROVED',
        },
      });

      // 2. Fetch conflicting appointments in transaction
      const affected = await tx.appointment.findMany({
        where: {
          doctorId,
          status: { notIn: ['CANCELLED', 'NOSHOW'] },
          OR: [
            { scheduledStart: { gte: start, lt: end } },
            { scheduledEnd: { gt: start, lte: end } },
            { scheduledStart: { lte: start }, scheduledEnd: { gte: end } },
          ],
        },
      });

      // 3. Cancel appointments & create notification records in database
      for (const appt of affected) {
        await tx.appointment.update({
          where: { id: appt.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: `Doctor leave: ${data.reason ?? 'No reason provided'}`,
            active: null,
          },
        });

        const notifBody = `Your appointment scheduled for ${appt.scheduledStart.toLocaleString()} has been cancelled because the doctor is on leave.`;
        await tx.notification.create({
          data: {
            patientId: appt.patientId,
            type: 'EMAIL',
            subject: 'Appointment Cancelled - Doctor on Leave',
            body: notifBody,
            metadata: { appointmentId: appt.id, leaveId: leave.id },
          },
        });
      }

      // 4. Log audit trail
      const auditLog = await tx.auditLog.create({
        data: {
          userId: doctor.userId,
          action: 'LEAVE_MARKED_DIRECT',
          resourceType: 'DoctorLeave',
          resourceId: leave.id,
          ipAddress,
          metadata: { cancelledAppointmentsCount: affected.length },
        },
      });

      return { leave, affected, auditLog };
    });

    // 5. Post-transaction tasks: Queue emails, update Google Calendar, notify admin
    for (const appt of result.affected) {
      // Dequeue/clean Google Calendar event asynchronously (gracefully)
      calendarService.deleteCalendarEvent(appt.id).catch(() => {});

      // Dispatch patient notification emails asynchronously (gracefully)
      const patient = await patientRepository.findById(appt.patientId);
      if (patient) {
        const user = await prisma.user.findFirst({ where: { id: patient.userId }, select: { email: true } });
        if (user) {
          const rescheduleLink = `${config.FRONTEND_URL}/dashboard/book?reschedule=true&appointmentId=${appt.id}&doctorId=${doctor.id}`;
          const notifBody = `Your appointment scheduled for ${appt.scheduledStart.toLocaleString()} has been cancelled because the doctor is on leave. You can reschedule your appointment by clicking the following link: ${rescheduleLink}`;
          queueEmail({
            to: user.email,
            subject: 'Appointment Cancelled - Doctor on Leave',
            body: notifBody,
            metadata: { appointmentId: appt.id },
          }).catch(() => {});
        }
      }
    }

    // Notify doctor of leave request approval
    prisma.user
      .findFirst({ where: { id: doctor.userId }, select: { email: true } })
      .then((doctorUser) => {
        if (doctorUser?.email) {
          queueEmail({
            to: doctorUser.email,
            subject: 'Leave Approved & Overlapping Appointments Cancelled',
            body: `Dear Dr. ${doctor.firstName} ${doctor.lastName}, your leave request from ${start.toLocaleString()} to ${end.toLocaleString()} has been approved. Affected appointments cancelled: ${result.affected.length}.`,
          }).catch(() => {});
        }
      })
      .catch(() => {});

    // Notify admins of approved doctor leave
    prisma.user
      .findMany({ where: { role: 'ADMIN', isDeleted: false }, select: { email: true } })
      .then((admins) => {
        for (const admin of admins) {
          queueEmail({
            to: admin.email,
            subject: `Doctor Leave Approved - Dr. ${doctor.firstName} ${doctor.lastName}`,
            body: `Dr. ${doctor.firstName} ${doctor.lastName} is on leave from ${start.toLocaleString()} to ${end.toLocaleString()}. Reason: ${data.reason ?? 'None'}. Affected appointments: ${result.affected.length}.`,
          }).catch(() => {});
        }
      })
      .catch(() => {});

    return {
      status: 'APPROVED',
      leave: result.leave,
      cancelledAppointments: result.affected.length,
    };
  },

  /**
   * Approves a leave and cancels all conflicting appointments.
   * Runs in a transaction supporting rollback.
   */
  async approveLeave(leaveId: string, adminUserId: string) {
    const leave = await prisma.doctorLeave.findUnique({ where: { id: leaveId } });
    if (!leave) throw HttpError.notFound('Leave request not found.', ErrorCode.NOT_FOUND);

    const doctor = await doctorRepository.findById(leave.doctorId);
    if (!doctor) throw HttpError.notFound('Doctor not found.', ErrorCode.NOT_FOUND);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark leave as approved
      const updated = await tx.doctorLeave.update({
        where: { id: leaveId },
        data: { status: 'APPROVED' },
      });

      // 2. Fetch affected appointments
      const affected = await tx.appointment.findMany({
        where: {
          doctorId: leave.doctorId,
          status: { notIn: ['CANCELLED', 'NOSHOW'] },
          OR: [
            { scheduledStart: { gte: leave.startDate, lt: leave.endDate } },
            { scheduledEnd: { gt: leave.startDate, lte: leave.endDate } },
            { scheduledStart: { lte: leave.startDate }, scheduledEnd: { gte: leave.endDate } },
          ],
        },
      });

      // 3. Cancel appointments & create notifications
      for (const appt of affected) {
        await tx.appointment.update({
          where: { id: appt.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: `Doctor leave approved: ${leave.reason ?? 'No reason provided'}`,
            active: null,
          },
        });

        const notifBody = `Your appointment scheduled for ${appt.scheduledStart.toLocaleString()} has been cancelled because the doctor is on leave.`;
        await tx.notification.create({
          data: {
            patientId: appt.patientId,
            type: 'EMAIL',
            subject: 'Appointment Cancelled - Doctor on Leave',
            body: notifBody,
            metadata: { appointmentId: appt.id, leaveId },
          },
        });
      }

      // 4. Log audit trail
      const auditLog = await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'LEAVE_APPROVED',
          resourceType: 'DoctorLeave',
          resourceId: leaveId,
          metadata: { cancelledAppointmentsCount: affected.length },
        },
      });

      return { leave: updated, affected, auditLog };
    });

    // 5. Post-transaction updates
    for (const appt of result.affected) {
      calendarService.deleteCalendarEvent(appt.id).catch(() => {});

      const patient = await patientRepository.findById(appt.patientId);
      if (patient) {
        const user = await prisma.user.findFirst({ where: { id: patient.userId }, select: { email: true } });
        if (user) {
          const rescheduleLink = `${config.FRONTEND_URL}/dashboard/book?reschedule=true&appointmentId=${appt.id}&doctorId=${doctor.id}`;
          const notifBody = `Your appointment scheduled for ${appt.scheduledStart.toLocaleString()} has been cancelled because the doctor is on leave. You can reschedule your appointment by clicking the following link: ${rescheduleLink}`;
          queueEmail({
            to: user.email,
            subject: 'Appointment Cancelled - Doctor on Leave',
            body: notifBody,
            metadata: { appointmentId: appt.id },
          }).catch(() => {});
        }
      }
    }

    // Notify doctor of leave request approval
    prisma.user
      .findFirst({ where: { id: doctor.userId }, select: { email: true } })
      .then((doctorUser) => {
        if (doctorUser?.email) {
          queueEmail({
            to: doctorUser.email,
            subject: 'Leave Approved & Overlapping Appointments Cancelled',
            body: `Dear Dr. ${doctor.firstName} ${doctor.lastName}, your leave request from ${leave.startDate.toLocaleString()} to ${leave.endDate.toLocaleString()} has been approved. Affected appointments cancelled: ${result.affected.length}.`,
          }).catch(() => {});
        }
      })
      .catch(() => {});

    // Notify admins
    prisma.user
      .findMany({ where: { role: 'ADMIN', isDeleted: false }, select: { email: true } })
      .then((admins) => {
        for (const admin of admins) {
          queueEmail({
            to: admin.email,
            subject: `Leave Request Approved by Admin - Dr. ${doctor.firstName} ${doctor.lastName}`,
            body: `Admin ${adminUserId} approved leave for Dr. ${doctor.firstName} ${doctor.lastName} from ${leave.startDate.toLocaleString()} to ${leave.endDate.toLocaleString()}. Affected appointments cancelled: ${result.affected.length}.`,
          }).catch(() => {});
        }
      })
      .catch(() => {});

    return {
      leave: result.leave,
      cancelledAppointments: result.affected.length,
    };
  },
};
