import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { prisma } from '../../database/prismaClient.js';
import { patientRepository } from '../../database/repositories/patient.repository.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';
import { HttpError } from '../../common/errors/HttpError.js';
import { ErrorCode } from '../../common/constants/errorCodes.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('PATIENT'),
  asyncHandler(async (req, res) => {
    const patient = await patientRepository.findByUserId(req.user!.id);
    if (!patient) throw HttpError.notFound('Patient profile not found.', ErrorCode.NOT_FOUND);

    const notifications = await prisma.notification.findMany({
      where: { patientId: patient.id },
      orderBy: { dispatchedAt: 'desc' },
      take: 50,
    });
    res.json(formatSuccess(notifications));
  }),
);

router.post(
  '/:id/read',
  authenticate,
  authorize('PATIENT'),
  asyncHandler(async (req, res) => {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json(formatSuccess(null, 'Notification marked as read.'));
  }),
);

export default router;
