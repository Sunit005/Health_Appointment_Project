import { z } from 'zod';

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; // HH:MM format

export const setWorkingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, { message: 'Day of week must be between 0 (Sunday) and 6 (Saturday).' }),
  startTime: z.string().regex(timeRegex, { message: 'Start time must be in HH:MM format (24-hour).' }),
  endTime: z.string().regex(timeRegex, { message: 'End time must be in HH:MM format (24-hour).' }),
  slotDurationMinutes: z.number().int().min(15).max(120).optional().default(30),
}).refine(
  (data) => {
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  },
  {
    message: 'End time must occur after start time.',
    path: ['endTime'],
  }
);

export const requestLeaveSchema = z.object({
  startDate: z.string().datetime({ message: 'Start date must be a valid ISO 8601 datetime string.' }),
  endDate: z.string().datetime({ message: 'End date must be a valid ISO 8601 datetime string.' }),
  reason: z.string().max(500, { message: 'Reason must not exceed 500 characters.' }).optional(),
  confirm: z.boolean().optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  },
  {
    message: 'End date must be greater than or equal to start date.',
    path: ['endDate'],
  }
);
