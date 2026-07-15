import { prisma } from '../../database/prismaClient.js';
import { doctorRepository } from '../../database/repositories/doctor.repository.js';
import { patientRepository } from '../../database/repositories/patient.repository.js';
import { appointmentRepository } from '../../database/repositories/appointment.repository.js';
import { authRepository } from '../auth/auth.repository.js';
import { HttpError } from '../../common/errors/HttpError.js';
import { ErrorCode } from '../../common/constants/errorCodes.js';
import { queueEmail, scheduleMedicationReminder } from '../notification/notification.queue.js';
import { logger } from '../../common/utils/logger.js';
import cronParser from 'cron-parser';

interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
}

function parseFrequencyToCron(frequency: string): string {
  const norm = frequency.trim().toLowerCase();
  switch (norm) {
    case 'once daily':
      return '0 9 * * *';
    case 'twice daily':
      return '0 9,21 * * *';
    case 'three times daily':
      return '0 9,15,21 * * *';
    case 'every 6 hours':
      return '0 */6 * * *';
    case 'every 8 hours':
      return '0 */8 * * *';
    case 'weekly':
      return '0 9 * * 0';
    default:
      if (norm.split(' ').length === 5) {
        return frequency;
      }
      return '0 9 * * *';
  }
}

export const prescriptionService = {
  /** Doctor creates a prescription and visit note after a consultation. */
  async createPrescription(
    doctorUserId: string,
    data: {
      appointmentId: string;
      clinicalNotes: string;
      diagnosis?: string;
      medications: MedicationItem[];
    },
    ipAddress?: string,
  ) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw HttpError.notFound('Doctor profile not found.', ErrorCode.NOT_FOUND);

    const appt = await appointmentRepository.findById(data.appointmentId);
    if (!appt) throw HttpError.notFound('Appointment not found.', ErrorCode.NOT_FOUND);
    if (appt.doctorId !== doctor.id) throw HttpError.forbidden('You are not the doctor for this appointment.');

    const result = await prisma.$transaction(async (tx) => {
      // Mark appointment complete
      await tx.appointment.update({
        where: { id: data.appointmentId },
        data: { status: 'COMPLETED' },
      });

      // Create visit note
      const note = await tx.visitNote.upsert({
        where: { appointmentId: data.appointmentId },
        update: { doctorNotes: data.clinicalNotes, diagnosis: data.diagnosis },
        create: {
          appointmentId: data.appointmentId,
          doctorNotes: data.clinicalNotes,
          diagnosis: data.diagnosis,
        },
      });

      // Create prescription
      const prescription = await tx.prescription.create({
        data: {
          appointmentId: data.appointmentId,
          patientId: appt.patientId,
          clinicalNotes: data.clinicalNotes,
        },
      });

      // Create medication reminders
      const reminders = await Promise.all(
        data.medications.map((med) => {
          const cron = parseFrequencyToCron(med.frequency);
          let nextFireAt: Date | null = null;
          try {
            const interval = cronParser.parseExpression(cron);
            nextFireAt = interval.next().toDate();
          } catch (err) {
            logger.error('Failed to parse cron frequency', { cron, error: err });
          }
          return tx.medicationReminder.create({
            data: {
              prescriptionId: prescription.id,
              patientId: appt.patientId,
              medicationName: med.name,
              dosageInstruction: med.dosage,
              frequencyCron: cron,
              nextFireAt,
            },
          });
        })
      );

      // Notification to patient
      await tx.notification.create({
        data: {
          patientId: appt.patientId,
          type: 'EMAIL',
          subject: 'Your Prescription is Ready',
          body: `Dr. ${doctor.firstName} ${doctor.lastName} has added your prescription. ${data.medications.length} medication(s) have been prescribed.`,
          metadata: { prescriptionId: prescription.id },
        },
      });

      return { prescription, note, reminders };
    });

    await authRepository.logAuditEvent({
      userId: doctorUserId,
      action: 'PRESCRIPTION_CREATED',
      resourceType: 'Prescription',
      resourceId: result.prescription.id,
      ipAddress,
    });

    // Dispatch prescription-ready email via BullMQ
    const patient = await patientRepository.findById(appt.patientId);
    if (patient) {
      const patientUser = await prisma.user.findFirst({
        where: { id: patient.userId },
        select: { email: true },
      });
      if (patientUser) {
        queueEmail({
          to: patientUser.email,
          subject: 'Your Prescription is Ready',
          body: `Dr. ${doctor.firstName} ${doctor.lastName} has issued your prescription. ${data.medications.length} medication(s) have been prescribed.`,
          metadata: { prescriptionId: result.prescription.id },
        }).catch(() => {});
      }

      // Schedule each medication reminder as a recurring BullMQ job
      for (const reminder of result.reminders) {
        scheduleMedicationReminder({
          reminderId: reminder.id,
          patientId: patient.id,
          medicationName: reminder.medicationName,
          dosageInstruction: reminder.dosageInstruction,
          frequencyCron: reminder.frequencyCron,
        }).catch(() => {});
      }
    }

    return result;
  },

  /** Patient views their prescription history. */
  async getPatientPrescriptions(patientUserId: string) {
    const patient = await patientRepository.findByUserId(patientUserId);
    if (!patient) throw HttpError.notFound('Patient profile not found.', ErrorCode.NOT_FOUND);

    return prisma.prescription.findMany({
      where: { patientId: patient.id },
      include: {
        medicationReminders: true,
        appointment: {
          include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
        },
      },
      orderBy: { prescribedAt: 'desc' },
    });
  },

  /** Patient views their medication reminders. */
  async getPatientReminders(patientUserId: string) {
    const patient = await patientRepository.findByUserId(patientUserId);
    if (!patient) throw HttpError.notFound('Patient profile not found.', ErrorCode.NOT_FOUND);

    return prisma.medicationReminder.findMany({
      where: { patientId: patient.id, isActive: true },
      include: { prescription: true, logs: { orderBy: { scheduledTime: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Marks a specific medication reminder occurrence log as completed. */
  async completeReminderLog(patientUserId: string, logId: string) {
    const patient = await patientRepository.findByUserId(patientUserId);
    if (!patient) throw HttpError.notFound('Patient profile not found.', ErrorCode.NOT_FOUND);

    const log = await prisma.medicationReminderLog.findUnique({
      where: { id: logId },
      include: { medicationReminder: true },
    });
    if (!log) throw HttpError.notFound('Reminder log not found.', ErrorCode.NOT_FOUND);

    if (log.medicationReminder.patientId !== patient.id) {
      throw HttpError.forbidden('You are not allowed to modify this reminder.');
    }

    const updated = await prisma.medicationReminderLog.update({
      where: { id: logId },
      data: {
        status: 'COMPLETED',
        takenAt: new Date(),
      },
    });

    await authRepository.logAuditEvent({
      userId: patientUserId,
      action: 'MEDICATION_REMINDER_COMPLETED',
      resourceType: 'MedicationReminderLog',
      resourceId: logId,
    });

    return updated;
  },
};
