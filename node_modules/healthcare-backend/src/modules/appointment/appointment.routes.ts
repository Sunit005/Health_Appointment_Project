import { Router } from 'express';
import { appointmentController } from './appointment.controller.js';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';

const router = Router();

router.post('/', authenticate, authorize('PATIENT'), asyncHandler(appointmentController.book));
router.post('/hold', authenticate, authorize('PATIENT'), asyncHandler(appointmentController.hold));
router.post('/:id/confirm', authenticate, authorize('PATIENT'), asyncHandler(appointmentController.confirm));
router.get('/my', authenticate, authorize('PATIENT'), asyncHandler(appointmentController.myHistory));
router.get('/doctor-schedule', authenticate, authorize('DOCTOR'), asyncHandler(appointmentController.doctorSchedule));
router.get('/:id', authenticate, asyncHandler(appointmentController.getById));
router.post('/:id/cancel', authenticate, asyncHandler(appointmentController.cancel));
router.put('/:id/reschedule', authenticate, authorize('PATIENT'), asyncHandler(appointmentController.reschedule));

export default router;
