import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { prisma } from '../../database/prismaClient.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';
import { userRepository } from '../../database/repositories/user.repository.js';
import { HttpError } from '../../common/errors/HttpError.js';
import { ErrorCode } from '../../common/constants/errorCodes.js';
import { hashPassword } from '../../common/utils/password.util.js';
import { doctorService } from '../doctor/doctor.service.js';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

/** GET /api/v1/admin/metrics — System dashboard metrics */
router.get(
  '/metrics',
  asyncHandler(async (_req, res) => {
    const [activeUsers, totalAppointments, pendingLeaves, activeReminders] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.appointment.count({ where: { status: { notIn: ['CANCELLED', 'NOSHOW'] } } }),
      prisma.doctorLeave.count({ where: { status: 'PENDING' } }),
      prisma.medicationReminder.count({ where: { isActive: true } }),
    ]);

    res.json(
      formatSuccess({
        activeUsers,
        totalAppointments,
        pendingLeaves,
        activeReminders,
        timestamp: new Date().toISOString(),
      }),
    );
  }),
);

/** GET /api/v1/admin/audit-logs — Recent audit log entries */
router.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = Math.min(parseInt((req.query.limit as string) ?? '50'), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { email: true, role: true } } },
      }),
      prisma.auditLog.count(),
    ]);

    res.json(formatSuccess({ logs, total, page, totalPages: Math.ceil(total / limit) }));
  }),
);

/** GET /api/v1/admin/users — Paginated user list */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = Math.min(parseInt((req.query.limit as string) ?? '20'), 100);
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: { isDeleted: false },
        select: { id: true, email: true, role: true, isEmailVerified: true, createdAt: true, lastLoginAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { isDeleted: false } }),
    ]);

    res.json(formatSuccess({ users, total, page, totalPages: Math.ceil(total / limit) }));
  }),
);

/** POST /api/v1/admin/users/:id/disable — Soft-disable a user account */
router.post(
  '/users/:id/disable',
  asyncHandler(async (req, res) => {
    const user = await userRepository.findById(req.params.id);
    if (!user) throw HttpError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    await userRepository.update(req.params.id, { isDeleted: true, deletedAt: new Date() });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_DISABLED',
        resourceType: 'User',
        resourceId: req.params.id,
        ipAddress: req.ip,
      },
    });

    res.json(formatSuccess(null, 'User account disabled.'));
  }),
);

/** GET /api/v1/admin/leaves — Pending leave requests */
router.get(
  '/leaves',
  asyncHandler(async (_req, res) => {
    const leaves = await prisma.doctorLeave.findMany({
      where: { status: 'PENDING' },
      include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(formatSuccess(leaves));
  }),
);

/** GET /api/v1/admin/doctors — List all doctor profiles */
router.get(
  '/doctors',
  asyncHandler(async (_req, res) => {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            email: true,
            isDeleted: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });
    res.json(formatSuccess(doctors));
  }),
);

/** POST /api/v1/admin/doctors — Create a new doctor user and profile */
router.post(
  '/doctors',
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, specialty, licenseNumber, bio, slotDurationMinutes } = req.body;

    if (!email || !password || !firstName || !lastName || !specialty) {
      throw HttpError.badRequest('Missing required fields for doctor profile.', ErrorCode.BAD_REQUEST);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw HttpError.conflict('Email already taken.', ErrorCode.EMAIL_TAKEN);
    }

    if (licenseNumber) {
      const existingLicense = await prisma.doctor.findUnique({ where: { licenseNumber } });
      if (existingLicense) {
        throw HttpError.conflict('License number already in use.', ErrorCode.EMAIL_TAKEN);
      }
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'DOCTOR',
          isEmailVerified: true,
        },
      });

      return tx.doctor.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          specialty,
          licenseNumber: licenseNumber || null,
          bio: bio || null,
          slotDurationMinutes: slotDurationMinutes ? parseInt(slotDurationMinutes) : 30,
        },
      });
    });

    res.json(formatSuccess(result, 'Doctor profile created successfully.'));
  }),
);

/** PUT /api/v1/admin/doctors/:id — Update doctor profile info */
router.put(
  '/doctors/:id',
  asyncHandler(async (req, res) => {
    const { firstName, lastName, specialty, bio, licenseNumber, slotDurationMinutes, isAvailable } = req.body;

    const doctor = await prisma.doctor.findUnique({ where: { id: req.params.id } });
    if (!doctor) {
      throw HttpError.notFound('Doctor profile not found.', ErrorCode.NOT_FOUND);
    }

    if (licenseNumber && licenseNumber !== doctor.licenseNumber) {
      const existingLicense = await prisma.doctor.findUnique({ where: { licenseNumber } });
      if (existingLicense) {
        throw HttpError.conflict('License number already in use.', ErrorCode.EMAIL_TAKEN);
      }
    }

    const updated = await prisma.doctor.update({
      where: { id: req.params.id },
      data: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        specialty: specialty ?? undefined,
        bio: bio !== undefined ? bio : undefined,
        licenseNumber: licenseNumber !== undefined ? licenseNumber : undefined,
        slotDurationMinutes: slotDurationMinutes ? parseInt(slotDurationMinutes) : undefined,
        isAvailable: isAvailable !== undefined ? isAvailable : undefined,
      },
    });

    res.json(formatSuccess(updated, 'Doctor profile updated successfully.'));
  }),
);

/** GET /api/v1/admin/doctors/:id/working-hours — Get doctor working hours */
router.get(
  '/doctors/:id/working-hours',
  asyncHandler(async (req, res) => {
    const workingHours = await prisma.doctorWorkingHour.findMany({
      where: { doctorId: req.params.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json(formatSuccess(workingHours));
  }),
);

/** PUT /api/v1/admin/doctors/:id/working-hours — Replace doctor working hours */
router.put(
  '/doctors/:id/working-hours',
  asyncHandler(async (req, res) => {
    const { workingHours } = req.body;

    if (!Array.isArray(workingHours)) {
      throw HttpError.badRequest('workingHours must be an array.', ErrorCode.BAD_REQUEST);
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: req.params.id } });
    if (!doctor) {
      throw HttpError.notFound('Doctor profile not found.', ErrorCode.NOT_FOUND);
    }

    await prisma.$transaction(async (tx) => {
      await tx.doctorWorkingHour.deleteMany({
        where: { doctorId: req.params.id },
      });

      for (const wh of workingHours) {
        await tx.doctorWorkingHour.create({
          data: {
            doctorId: req.params.id,
            dayOfWeek: parseInt(wh.dayOfWeek),
            startTime: wh.startTime,
            endTime: wh.endTime,
            slotDurationMinutes: wh.slotDurationMinutes ? parseInt(wh.slotDurationMinutes) : doctor.slotDurationMinutes,
          },
        });
      }
    });

    const updated = await prisma.doctorWorkingHour.findMany({
      where: { doctorId: req.params.id },
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json(formatSuccess(updated, 'Working hours updated successfully.'));
  }),
);

/** GET /api/v1/admin/doctors/:id/leaves — Get leaves for a doctor */
router.get(
  '/doctors/:id/leaves',
  asyncHandler(async (req, res) => {
    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId: req.params.id },
      orderBy: { startDate: 'desc' },
    });
    res.json(formatSuccess(leaves));
  }),
);

/** POST /api/v1/admin/doctors/:id/leaves — Add and auto-approve leave for doctor */
router.post(
  '/doctors/:id/leaves',
  asyncHandler(async (req, res) => {
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate) {
      throw HttpError.badRequest('Missing startDate or endDate.', ErrorCode.BAD_REQUEST);
    }

    const approved = await doctorService.requestLeave(
      req.params.id,
      { startDate, endDate, reason, confirm: true },
      req.ip,
    );

    res.json(formatSuccess(approved, 'Doctor leave created and approved successfully.'));
  }),
);

export default router;
