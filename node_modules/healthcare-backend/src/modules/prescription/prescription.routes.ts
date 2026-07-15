import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { prescriptionService } from './prescription.service.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('DOCTOR'),
  asyncHandler(async (req, res) => {
    const result = await prescriptionService.createPrescription(req.user!.id, req.body, req.ip);
    res.status(201).json(formatSuccess({ prescriptionId: result.prescription.id }, 'Prescription created.'));
  }),
);

router.get(
  '/my',
  authenticate,
  authorize('PATIENT'),
  asyncHandler(async (req, res) => {
    const data = await prescriptionService.getPatientPrescriptions(req.user!.id);
    res.json(formatSuccess(data));
  }),
);

router.get(
  '/reminders',
  authenticate,
  authorize('PATIENT'),
  asyncHandler(async (req, res) => {
    const data = await prescriptionService.getPatientReminders(req.user!.id);
    res.json(formatSuccess(data));
  }),
);

router.post(
  '/reminders/logs/:id/complete',
  authenticate,
  authorize('PATIENT'),
  asyncHandler(async (req, res) => {
    const data = await prescriptionService.completeReminderLog(req.user!.id, req.params.id);
    res.json(formatSuccess(data, 'Medication reminder marked as completed.'));
  }),
);

export default router;
