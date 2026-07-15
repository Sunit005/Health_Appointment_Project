import { Router } from 'express';
import { doctorController } from './doctor.controller.js';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { setWorkingHoursSchema, requestLeaveSchema } from './validation/doctor.validation.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';

const router = Router();

// Public / patient-accessible
router.get('/', authenticate, asyncHandler(doctorController.listDoctors));
router.get('/:id', authenticate, asyncHandler(doctorController.getDoctorById));
router.get('/:id/slots', authenticate, asyncHandler(doctorController.getAvailableSlots));

// Doctor-only
router.put(
  '/me/working-hours',
  authenticate,
  authorize('DOCTOR'),
  validate(setWorkingHoursSchema),
  asyncHandler(doctorController.setWorkingHours)
);
router.post(
  '/me/leaves',
  authenticate,
  authorize('DOCTOR'),
  validate(requestLeaveSchema),
  asyncHandler(doctorController.requestLeave)
);

// Admin-only
router.post('/leaves/:leaveId/approve', authenticate, authorize('ADMIN'), asyncHandler(doctorController.approveLeave));

export default router;
