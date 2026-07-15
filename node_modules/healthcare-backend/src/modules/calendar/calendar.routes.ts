import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { calendarService } from './calendar.service.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';

const router = Router();

router.get(
  '/auth',
  authenticate,
  authorize('DOCTOR'),
  asyncHandler(async (req, res) => {
    const url = calendarService.getAuthUrl(req.user!.id);
    res.json(formatSuccess({ authUrl: url }));
  }),
);

router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.query as { code: string; state: string };
    await calendarService.handleCallback(code, state);
    res.redirect(`${process.env.FRONTEND_URL}/doctor/dashboard?calendar=connected`);
  }),
);

router.post(
  '/sync/:appointmentId',
  authenticate,
  authorize('DOCTOR'),
  asyncHandler(async (req, res) => {
    await calendarService.createCalendarEvent(req.params.appointmentId);
    res.json(formatSuccess(null, 'Calendar synchronization completed successfully.'));
  }),
);

export default router;
