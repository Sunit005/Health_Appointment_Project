import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { aiService } from './ai.service.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';

const router = Router();

router.post('/triage', authenticate, authorize('PATIENT'), asyncHandler(async (req, res) => {
  const { symptomText } = req.body as { symptomText: string };
  if (!symptomText?.trim()) {
    res.status(400).json({ success: false, message: 'symptomText is required.' });
    return;
  }
  const result = await aiService.triageSymptoms(symptomText);
  res.json(formatSuccess(result));
}));

router.post('/pre-visit/:appointmentId', authenticate, authorize('PATIENT', 'DOCTOR'), asyncHandler(async (req, res) => {
  await aiService.generatePreVisitSummary(req.params.appointmentId);
  res.json(formatSuccess(null, 'Pre-visit summary generation triggered.'));
}));

router.post('/post-visit/:appointmentId', authenticate, authorize('DOCTOR'), asyncHandler(async (req, res) => {
  await aiService.generatePostVisitSummary(req.params.appointmentId);
  res.json(formatSuccess(null, 'Post-visit summary generation triggered.'));
}));

export default router;
