import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { prisma } from '../../database/prismaClient.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';
import { HttpError } from '../../common/errors/HttpError.js';
import { ErrorCode } from '../../common/constants/errorCodes.js';

const router = Router();

router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true,
            bio: true,
            avatarUrl: true,
            rating: true,
            reviewCount: true,
            slotDurationMinutes: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dob: true,
            phoneNumber: true,
            avatarUrl: true,
            medicalRecordNumber: true,
          },
        },
      },
    });

    if (!user) throw HttpError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    res.json(formatSuccess(user));
  }),
);

router.put(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role === 'PATIENT') {
      const { firstName, lastName, phoneNumber } = req.body as {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
      };
      const updated = await prisma.patient.update({
        where: { userId },
        data: { ...(firstName && { firstName }), ...(lastName && { lastName }), ...(phoneNumber && { phoneNumber }) },
      });
      res.json(formatSuccess(updated, 'Profile updated.'));
    } else if (role === 'DOCTOR') {
      const { firstName, lastName, specialty, bio, slotDurationMinutes } = req.body as {
        firstName?: string;
        lastName?: string;
        specialty?: string;
        bio?: string;
        slotDurationMinutes?: number;
      };
      const updated = await prisma.doctor.update({
        where: { userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(specialty && { specialty }),
          ...(bio !== undefined && { bio }),
          ...(slotDurationMinutes && { slotDurationMinutes }),
        },
      });
      res.json(formatSuccess(updated, 'Profile updated.'));
    } else {
      res.json(formatSuccess(null, 'Admin profiles are managed separately.'));
    }
  }),
);

router.get(
  '/patients/:id/records',
  authenticate,
  asyncHandler(async (req, res) => {
    const requestingUser = req.user!;

    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: {
        appointments: {
          include: {
            doctor: { select: { firstName: true, lastName: true, specialty: true } },
            visitNote: true,
            prescriptions: { include: { medicationReminders: true } },
          },
          orderBy: { scheduledStart: 'desc' },
        },
      },
    });

    if (!patient) throw HttpError.notFound('Patient not found.', ErrorCode.NOT_FOUND);

    // Patients can only see their own records
    if (requestingUser.role === 'PATIENT') {
      const ownPatient = await prisma.patient.findFirst({ where: { userId: requestingUser.id } });
      if (ownPatient?.id !== patient.id) {
        throw HttpError.forbidden('You cannot access another patient\'s records.');
      }
    }

    const records = patient.appointments.map((a) => ({
      appointmentId: a.id,
      visitDate: a.scheduledStart,
      status: a.status,
      doctorName: `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`,
      specialty: a.doctor.specialty,
      clinicalNotes: a.visitNote?.doctorNotes ?? null,
      patientSummary: a.visitNote?.patientSummary ?? null,
      prescriptions: a.prescriptions,
    }));

    res.json(formatSuccess({ patientId: patient.id, records }));
  }),
);

export default router;
