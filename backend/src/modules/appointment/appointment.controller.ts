import type { Request, Response } from 'express';
import { appointmentService } from './appointment.service.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';
import { HttpStatus } from '../../common/constants/httpStatus.js';

export const appointmentController = {
  async book(req: Request, res: Response) {
    const appt = await appointmentService.bookAppointment(req.user!.id, req.body, req.ip);
    res.status(HttpStatus.CREATED).json(formatSuccess({ appointmentId: appt.id, status: appt.status }));
  },

  async getById(req: Request, res: Response) {
    const appt = await appointmentService.getById(req.params.id);
    res.json(formatSuccess(appt));
  },

  async cancel(req: Request, res: Response) {
    const appt = await appointmentService.cancelAppointment(
      req.params.id,
      req.user!.id,
      req.body.reason,
      req.ip,
    );
    res.json(formatSuccess(appt, 'Appointment cancelled.'));
  },

  async reschedule(req: Request, res: Response) {
    const appt = await appointmentService.rescheduleAppointment(
      req.params.id,
      req.user!.id,
      req.body.scheduledStart,
      req.ip,
    );
    res.json(formatSuccess(appt, 'Appointment rescheduled.'));
  },

  async myHistory(req: Request, res: Response) {
    const { page, limit } = req.query as Record<string, string>;
    const result = await appointmentService.getPatientHistory(
      req.user!.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    res.json(formatSuccess(result));
  },

  async doctorSchedule(req: Request, res: Response) {
    const { date } = req.query as Record<string, string>;
    const appts = await appointmentService.getDoctorSchedule(req.user!.id, date);
    res.json(formatSuccess(appts));
  },

  async hold(req: Request, res: Response) {
    const appt = await appointmentService.holdSlot(req.user!.id, req.body, req.ip);
    res.status(HttpStatus.CREATED).json(formatSuccess({
      appointmentId: appt.id,
      status: appt.status,
      holdExpiresAt: appt.holdExpiresAt,
    }));
  },

  async confirm(req: Request, res: Response) {
    const appt = await appointmentService.confirmBooking(req.params.id, req.user!.id, req.body, req.ip);
    res.json(formatSuccess({
      appointmentId: appt.id,
      status: appt.status,
    }, 'Appointment confirmed successfully.'));
  },
};
