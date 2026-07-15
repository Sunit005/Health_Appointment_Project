import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { appointmentApi } from '@/services/api/appointmentApi';
import { doctorApi } from '@/services/api/doctorApi';
import { apiClient } from '@/services/api/axiosClient';
import { getErrorMessage } from '@/utils/formatters';

type Tab = 'schedule' | 'hours' | 'leave' | 'notes';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorDashboardPage() {
  const [tab, setTab] = useState<Tab>('schedule');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAppt, setSelectedAppt] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const qc = useQueryClient();

  // Working hours form
  const [wh, setWh] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 });

  // Leave form
  const [leave, setLeave] = useState({ startDate: '', endDate: '', reason: '' });

  const { data: schedule, isLoading: schedLoading } = useQuery({
    queryKey: ['doctor-schedule', scheduleDate],
    queryFn: () => appointmentApi.doctorSchedule(scheduleDate).then((r) => r.data.data),
    enabled: tab === 'schedule',
  });

  const whMutation = useMutation({
    mutationFn: () => doctorApi.setWorkingHours(wh),
    onSuccess: () => toast.success('Working hours updated.'),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const leaveMutation = useMutation({
    mutationFn: () => doctorApi.requestLeave(leave),
    onSuccess: () => { toast.success('Leave request submitted.'); setLeave({ startDate: '', endDate: '', reason: '' }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const noteMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/api/v1/prescriptions', {
        appointmentId: selectedAppt,
        clinicalNotes: doctorNotes,
        diagnosis,
        medications: [],
      }),
    onSuccess: () => {
      toast.success('Visit note saved and appointment completed.');
      qc.invalidateQueries({ queryKey: ['doctor-schedule', scheduleDate] });
      setSelectedAppt(null);
      setDoctorNotes('');
      setDiagnosis('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const calAuthQuery = useQuery({
    queryKey: ['calendar-auth-url'],
    queryFn: () => apiClient.get('/api/v1/calendar/auth').then((r) => r.data.data.authUrl as string),
    enabled: false,
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'schedule', label: "Today's Schedule" },
    { id: 'hours', label: 'Working Hours' },
    { id: 'leave', label: 'Request Leave' },
    { id: 'notes', label: 'Visit Notes' },
  ];

  const todayAppts = Array.isArray(schedule) ? schedule : [];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      <Navbar title="Doctor Portal" />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── SCHEDULE ── */}
          {tab === 'schedule' && (
            <motion.div key="schedule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-auto" />
                <Button variant="secondary" size="sm" onClick={async () => {
                  const { data } = await calAuthQuery.refetch();
                  if (data) window.location.href = data;
                }}>
                  Connect Google Calendar
                </Button>
              </div>

              {schedLoading && <LoadingSpinner className="py-8" />}

              {todayAppts.length === 0 && !schedLoading && (
                <Card><p className="py-8 text-center text-sm text-[var(--text-secondary)]">No appointments on this date.</p></Card>
              )}

              {todayAppts.map((a: {
                id: string;
                scheduledStart: string;
                scheduledEnd: string;
                status: string;
                patient: { firstName: string; lastName: string; medicalRecordNumber: string };
                symptomSubmission: { rawText: string; urgencyLevel: string } | null;
              }) => (
                <motion.div key={a.id} whileHover={{ x: 2 }}>
                  <Card className="cursor-pointer" onClick={() => { setSelectedAppt(a.id); setTab('notes'); }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {a.patient.firstName} {a.patient.lastName}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          MRN: {a.patient.medicalRecordNumber} · {new Date(a.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(a.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {a.symptomSubmission && (
                          <p className="mt-1 text-xs text-[var(--text-secondary)] italic">"{a.symptomSubmission.rawText.slice(0, 80)}…"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {a.symptomSubmission && (
                          <Badge variant={a.symptomSubmission.urgencyLevel === 'CRITICAL' ? 'danger' : a.symptomSubmission.urgencyLevel === 'URGENT' ? 'warning' : 'success'}>
                            {a.symptomSubmission.urgencyLevel}
                          </Badge>
                        )}
                        <Badge variant={a.status === 'BOOKED' ? 'info' : 'default'}>{a.status}</Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── WORKING HOURS ── */}
          {tab === 'hours' && (
            <motion.div key="hours" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="max-w-md">
                <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Set Working Hours</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Day of Week</label>
                    <select
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                      value={wh.dayOfWeek}
                      onChange={(e) => setWh({ ...wh, dayOfWeek: parseInt(e.target.value) })}
                    >
                      {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Start Time" type="time" value={wh.startTime} onChange={(e) => setWh({ ...wh, startTime: e.target.value })} />
                    <Input label="End Time" type="time" value={wh.endTime} onChange={(e) => setWh({ ...wh, endTime: e.target.value })} />
                  </div>
                  <Input
                    label="Slot Duration (minutes)"
                    type="number"
                    value={String(wh.slotDurationMinutes)}
                    onChange={(e) => setWh({ ...wh, slotDurationMinutes: parseInt(e.target.value) })}
                  />
                  <Button className="w-full" isLoading={whMutation.isPending} onClick={() => whMutation.mutate()}>
                    Save Working Hours
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── LEAVE ── */}
          {tab === 'leave' && (
            <motion.div key="leave" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="max-w-md">
                <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Request Leave</h2>
                <div className="space-y-4">
                  <Input label="Start Date" type="date" value={leave.startDate} onChange={(e) => setLeave({ ...leave, startDate: e.target.value })} />
                  <Input label="End Date" type="date" value={leave.endDate} onChange={(e) => setLeave({ ...leave, endDate: e.target.value })} />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Reason (optional)</label>
                    <textarea
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                      rows={3}
                      value={leave.reason}
                      onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-[var(--brand-warning)]">⚠ Approving this leave will cancel all conflicting appointments and notify patients.</p>
                  <Button className="w-full" isLoading={leaveMutation.isPending} onClick={() => leaveMutation.mutate()}>
                    Submit Leave Request
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── VISIT NOTES ── */}
          {tab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="max-w-2xl">
                <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Record Visit Note</h2>
                {!selectedAppt ? (
                  <p className="text-sm text-[var(--text-secondary)]">Select an appointment from the schedule to add notes.</p>
                ) : (
                  <div className="space-y-4">
                    <Input label="Diagnosis" placeholder="e.g. Hypertension Stage 1" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Clinical Notes</label>
                      <textarea
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                        rows={6}
                        placeholder="Enter clinical notes, findings, and recommendations…"
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      AI will automatically generate a patient-friendly summary after saving.
                    </p>
                    <Button className="w-full" isLoading={noteMutation.isPending} disabled={!doctorNotes.trim()} onClick={() => noteMutation.mutate()}>
                      Save Note & Complete Appointment
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
