import type { Request, Response } from 'express';
import { doctorService } from './doctor.service.js';
import { formatSuccess } from '../../common/utils/responseFormatter.js';
import { HttpStatus } from '../../common/constants/httpStatus.js';

export const doctorController = {
  async listDoctors(req: Request, res: Response) {
    const { specialty, search, page, limit, sortBy, sortOrder } = req.query as Record<string, string>;
    const result = await doctorService.listDoctors({
      specialty,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 100) : 20,
      sortBy: (sortBy as 'name' | 'rating' | 'specialty') ?? 'name',
      sortOrder: (sortOrder as 'asc' | 'desc') ?? 'asc',
    });
    res.json(formatSuccess(result));
  },

  async getDoctorById(req: Request, res: Response) {
    const doctor = await doctorService.getDoctorById(req.params.id);
    res.json(formatSuccess(doctor));
  },

  async getAvailableSlots(req: Request, res: Response) {
    const result = await doctorService.getAvailableSlots(req.params.id, req.query.date as string);
    res.json(formatSuccess(result));
  },

  async setWorkingHours(req: Request, res: Response) {
    const doctorId = req.user!.id;
    const doctor = await import('../../database/repositories/doctor.repository.js').then((m) =>
      m.doctorRepository.findByUserId(doctorId),
    );
    if (!doctor) {
      res.status(HttpStatus.NOT_FOUND).json(formatSuccess(null, 'Doctor profile not found.'));
      return;
    }
    const result = await doctorService.setWorkingHours(doctor.id, req.body);
    res.json(formatSuccess(result, 'Working hours updated.'));
  },

  async requestLeave(req: Request, res: Response) {
    const doctorId = req.user!.id;
    const repo = await import('../../database/repositories/doctor.repository.js');
    const doctor = await repo.doctorRepository.findByUserId(doctorId);
    if (!doctor) {
      res.status(HttpStatus.NOT_FOUND).json(formatSuccess(null, 'Doctor profile not found.'));
      return;
    }
    const result = await doctorService.requestLeave(doctor.id, req.body, req.ip);
    if (result.status === 'CONFLICTS_DETECTED') {
      res.status(HttpStatus.OK).json(formatSuccess(result, 'Conflicts detected.'));
    } else {
      res.status(HttpStatus.CREATED).json(formatSuccess(result, 'Leave request approved and registered.'));
    }
  },

  async approveLeave(req: Request, res: Response) {
    const result = await doctorService.approveLeave(req.params.leaveId, req.user!.id);
    res.json(formatSuccess(result, 'Leave approved and affected appointments cancelled.'));
  },
};
