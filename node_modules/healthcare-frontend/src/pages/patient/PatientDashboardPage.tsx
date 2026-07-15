import { useState, useEffect } from 'react';
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
import { notificationApi } from '@/services/api/notificationApi';
import { aiApi } from '@/services/api/aiApi';
import { prescriptionApi } from '@/services/api/prescriptionApi';
import { getErrorMessage } from '@/utils/formatters';

type Tab = 'overview' | 'book' | 'history' | 'reminders' | 'triage';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  BOOKED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  RESCHEDULED: 'warning',
  NOSHOW: 'danger',
  PENDING_HOLD: 'warning',
};

export default function PatientDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [symptomText, setSymptomText] = useState('');
  const [heldAppointmentId, setHeldAppointmentId] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const qc = useQueryClient();

  useEffect(() => {
    if (!holdExpiresAt) return;

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        clearInterval(timer);
        setSelectedSlot('');
        setHeldAppointmentId('');
        setHoldExpiresAt(null);
        toast.error('Your slot reservation has expired. Please select a slot again.');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [holdExpiresAt]);

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: () => appointmentApi.myHistory().then((r) => r.data.data),
    enabled: tab === 'history' || tab === 'overview',
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list().then((r) => r.data.data as Array<{ id: string; subject: string; body: string; isRead: boolean; dispatchedAt: string }>),
    enabled: tab === 'overview',
  });

  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors', doctorSearch],
    queryFn: () => doctorApi.list({ search: doctorSearch || undefined, limit: 50 }).then((r) => r.data.data),
    enabled: tab === 'book',
  });

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', selectedDoctorId, selectedDate],
    queryFn: () => doctorApi.getSlots(selectedDoctorId, selectedDate).then((r) => r.data.data),
    enabled: !!selectedDoctorId && !!selectedDate,
  });

  const holdMutation = useMutation({
    mutationFn: (start: string) =>
      appointmentApi.hold({
        doctorId: selectedDoctorId,
        scheduledStart: start,
      }),
    onSuccess: (res, start) => {
      const appt = res.data.data;
      setHeldAppointmentId(appt.appointmentId);
      setHoldExpiresAt(appt.holdExpiresAt);
      setSelectedSlot(start);
      setTimeLeft(300);
      toast.success('Slot reserved for 5 minutes!');
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      appointmentApi.confirm(heldAppointmentId, {
        symptomDescription: symptomText || undefined,
      }),
    onSuccess: () => {
      toast.success('Appointment confirmed successfully!');
      qc.invalidateQueries({ queryKey: ['appointments', 'my'] });
      setTab('history');
      setSelectedDoctorId('');
      setSelectedDate('');
      setSelectedSlot('');
      setSymptomText('');
      setHeldAppointmentId('');
      setHoldExpiresAt(null);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setSelectedSlot('');
      setHeldAppointmentId('');
      setHoldExpiresAt(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.cancel(id),
    onSuccess: () => {
      toast.success('Appointment cancelled.');
      qc.invalidateQueries({ queryKey: ['appointments', 'my'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const [triageResult, setTriageResult] = useState<{
    urgencyLevel: string;
    suggestedSpecialty: string;
    disclaimer: string;
  } | null>(null);
  const triageMutation = useMutation({
    mutationFn: () => aiApi.triage(symptomText),
    onSuccess: (res) => setTriageResult(res.data.data),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { data: remindersData, isLoading: remindersLoading } = useQuery({
    queryKey: ['medication-reminders'],
    queryFn: async () => {
      const res = await prescriptionApi.getReminders();
      return res.data.data;
    },
    enabled: tab === 'reminders',
  });

  const { data: prescriptionsData, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      const res = await prescriptionApi.getMyPrescriptions();
      return res.data.data;
    },
    enabled: tab === 'reminders',
  });

  const completeReminderMutation = useMutation({
    mutationFn: (logId: string) => prescriptionApi.completeReminderLog(logId),
    onSuccess: () => {
      toast.success('Medication marked as completed!');
      qc.invalidateQueries({ queryKey: ['medication-reminders'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const upcomingAppts = historyData?.appointments?.filter(
    (a: { status: string; scheduledStart: string }) =>
      ['BOOKED', 'RESCHEDULED', 'PENDING_HOLD'].includes(a.status) &&
      new Date(a.scheduledStart) > new Date(),
  ) ?? [];

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'book', label: 'Book Appointment' },
    { id: 'history', label: 'My Appointments' },
    { id: 'triage', label: 'AI Symptom Check' },
    { id: 'reminders', label: 'Medications' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      <Navbar title="Patient Portal" />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Upcoming</p>
                  <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">{upcomingAppts.length}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">appointments scheduled</p>
                </Card>
                <Card>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Unread Notifications</p>
                  <p className="mt-1 text-3xl font-bold text-[var(--brand-primary)]">
                    {notifData?.filter((n) => !n.isRead).length ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">new messages</p>
                </Card>
                <Card className="col-span-full sm:col-span-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Quick Action</p>
                  <Button className="mt-2 w-full text-sm" onClick={() => setTab('book')}>
                    Book Appointment
                  </Button>
                </Card>
              </div>

              {upcomingAppts.length > 0 && (
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Upcoming Appointments</h2>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {upcomingAppts.slice(0, 3).map((a: { id: string; scheduledStart: string; status: string; doctor?: { firstName: string; lastName: string; specialty: string } }) => (
                      <div key={a.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            Dr. {a.doctor?.firstName} {a.doctor?.lastName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">{a.doctor?.specialty} · {new Date(a.scheduledStart).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant[a.status] ?? 'default'}>{a.status}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate(a.id)}>Cancel</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {notifData && notifData.length > 0 && (
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Recent Notifications</h2>
                  <div className="space-y-2">
                    {notifData.slice(0, 5).map((n) => (
                      <div key={n.id} className={`rounded-lg p-3 text-sm ${n.isRead ? 'opacity-60' : 'bg-[var(--brand-primary)]/5'}`}>
                        <p className="font-medium text-[var(--text-primary)]">{n.subject}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* ── BOOK APPOINTMENT ── */}
          {tab === 'book' && (
            <motion.div key="book" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <Card>
                <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Search Doctors</h2>
                <Input
                  placeholder="Search by name or specialty…"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                />
              </Card>

              {doctorsLoading && <LoadingSpinner className="py-8" />}

              {doctorsData?.doctors && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {doctorsData.doctors.map((d: { id: string; firstName: string; lastName: string; specialty: string; rating: number }) => (
                    <motion.button
                      key={d.id}
                      whileHover={{ y: -2 }}
                      onClick={() => setSelectedDoctorId(d.id)}
                      className={`rounded-[var(--radius-card)] border p-4 text-left transition-all ${
                        selectedDoctorId === d.id
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--brand-primary)]/40'
                      }`}
                    >
                      <p className="font-medium text-[var(--text-primary)]">Dr. {d.firstName} {d.lastName}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{d.specialty}</p>
                      <p className="mt-1 text-xs text-[var(--brand-warning)]">★ {d.rating.toFixed(1)}</p>
                    </motion.button>
                  ))}
                </div>
              )}

              {selectedDoctorId && (
                <Card>
                  <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Select Date & Slot</h2>
                  <Input
                    label="Date"
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />

                  {slotsLoading && <LoadingSpinner className="mt-4" size="sm" />}

                  {slotsData?.slots && (
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                      {slotsData.slots.map((slot: { start: string; end: string; available: boolean }) => (
                        <button
                          key={slot.start}
                          disabled={!slot.available || holdMutation.isPending}
                          onClick={() => holdMutation.mutate(slot.start)}
                          className={`rounded-lg border py-2 text-xs font-medium transition-all ${
                            !slot.available
                              ? 'cursor-not-allowed opacity-30 border-[var(--border-subtle)] text-[var(--text-secondary)]'
                              : selectedSlot === slot.start
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                                : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]'
                          }`}
                        >
                          {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {selectedSlot && (
                <Card>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">Describe Symptoms (optional)</h2>
                    {holdExpiresAt && (
                      <span className="rounded-full bg-[var(--brand-warning)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--brand-warning)]">
                        Hold expires in {formatTimeLeft(timeLeft)}
                      </span>
                    )}
                  </div>
                  <textarea
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                    rows={3}
                    placeholder="Describe your symptoms…"
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                  />
                  <Button
                    className="mt-4 w-full"
                    isLoading={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate()}
                  >
                    Confirm Booking
                  </Button>
                </Card>
              )}
            </motion.div>
          )}

          {/* ── HISTORY ── */}
          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {historyLoading && <LoadingSpinner className="py-12" />}
              {historyData?.appointments && (
                <Card>
                  <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Appointment History</h2>
                  {historyData.appointments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No appointments yet.</p>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {historyData.appointments.map((a: { id: string; scheduledStart: string; status: string; doctor?: { firstName: string; lastName: string; specialty: string } }) => (
                        <div key={a.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              Dr. {a.doctor?.firstName} {a.doctor?.lastName}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {a.doctor?.specialty} · {new Date(a.scheduledStart).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusVariant[a.status] ?? 'default'}>{a.status}</Badge>
                            {['BOOKED', 'RESCHEDULED'].includes(a.status) && new Date(a.scheduledStart) > new Date() && (
                              <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate(a.id)}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </motion.div>
          )}

          {/* ── AI TRIAGE ── */}
          {tab === 'triage' && (
            <motion.div key="triage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <Card>
                <h2 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">AI Symptom Assessment</h2>
                <p className="mb-4 text-xs text-[var(--text-secondary)]">
                  Describe your symptoms and our AI will suggest an urgency level and specialist.
                  This is not a medical diagnosis.
                </p>
                <textarea
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                  rows={4}
                  placeholder="e.g. I have been experiencing chest tightness and shortness of breath…"
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                />
                <Button
                  className="mt-3 w-full"
                  isLoading={triageMutation.isPending}
                  disabled={!symptomText.trim()}
                  onClick={() => triageMutation.mutate()}
                >
                  Analyse Symptoms
                </Button>
              </Card>

              <AnimatePresence>
                {triageResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card>
                      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Assessment Result</h3>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            triageResult.urgencyLevel === 'CRITICAL'
                              ? 'danger'
                              : triageResult.urgencyLevel === 'URGENT'
                                ? 'warning'
                                : 'success'
                          }
                          className="text-sm px-3 py-1"
                        >
                          {triageResult.urgencyLevel}
                        </Badge>
                        <span className="text-sm text-[var(--text-secondary)]">
                          Suggested: <strong className="text-[var(--text-primary)]">{triageResult.suggestedSpecialty}</strong>
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-[var(--brand-warning)]">⚠ {triageResult.disclaimer}</p>
                      {triageResult.urgencyLevel !== 'ROUTINE' && (
                        <Button className="mt-4 w-full" onClick={() => setTab('book')}>
                          Book Appointment Now
                        </Button>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── MEDICATION REMINDERS ── */}
          {tab === 'reminders' && (
            <motion.div key="reminders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {remindersLoading || prescriptionsLoading ? (
                <LoadingSpinner className="py-12" />
              ) : (
                <>
                  {/* Compliance Schedule logs */}
                  <Card>
                    <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Medication Schedule & History</h2>
                    {(!remindersData || remindersData.length === 0) ? (
                      <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No active medication reminders.</p>
                    ) : (
                      <div className="space-y-6">
                        {remindersData.map((reminder: any) => (
                          <div key={reminder.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3 mb-3">
                              <div>
                                <h3 className="font-semibold text-sm text-[var(--text-primary)]">{reminder.medicationName}</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Dosage: {reminder.dosageInstruction}</p>
                              </div>
                              <div className="text-left sm:text-right">
                                <Badge variant="info">Active</Badge>
                                {reminder.nextFireAt && (
                                  <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                                    Next reminder: {new Date(reminder.nextFireAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Logs list */}
                            <div>
                              <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">Compliance History & Doses</p>
                              {(!reminder.logs || reminder.logs.length === 0) ? (
                                <p className="text-xs text-[var(--text-secondary)] italic">No reminder history logged yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {reminder.logs.map((log: any) => (
                                    <div key={log.id} className="flex items-center justify-between rounded bg-[var(--bg-base)] p-2.5 text-xs">
                                      <div>
                                        <p className="font-medium text-[var(--text-primary)]">
                                          Scheduled: {new Date(log.scheduledTime).toLocaleString()}
                                        </p>
                                        {log.takenAt && (
                                          <p className="text-[10px] text-[var(--brand-success)]">
                                            Taken at: {new Date(log.takenAt).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        {log.status === 'PENDING' ? (
                                          <Button
                                            size="sm"
                                            onClick={() => completeReminderMutation.mutate(log.id)}
                                            isLoading={completeReminderMutation.isPending && completeReminderMutation.variables === log.id}
                                          >
                                            Mark as Taken
                                          </Button>
                                        ) : (
                                          <Badge variant="success">Completed</Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Active Prescriptions list */}
                  <Card>
                    <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">My Prescriptions</h2>
                    {(!prescriptionsData || prescriptionsData.length === 0) ? (
                      <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No prescriptions issued yet.</p>
                    ) : (
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {prescriptionsData.map((prescription: any) => (
                          <div key={prescription.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                                Prescription on {new Date(prescription.createdAt).toLocaleDateString()}
                              </h3>
                              <p className="text-xs text-[var(--text-secondary)]">
                                Doctor: Dr. {prescription.appointment?.doctor?.firstName} {prescription.appointment?.doctor?.lastName}
                              </p>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mb-3 bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-subtle)]">
                              <strong>Clinical Notes:</strong> {prescription.clinicalNotes}
                            </p>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-[var(--text-primary)]">Prescribed Medications:</p>
                              {prescription.medicationReminders?.map((mr: any) => (
                                <div key={mr.id} className="flex justify-between items-center text-xs pl-3 border-l-2 border-[var(--brand-primary)] py-0.5">
                                  <span className="text-[var(--text-primary)] font-medium">{mr.medicationName} ({mr.dosageInstruction})</span>
                                  <span className="text-[var(--text-secondary)] text-[10px]">Frequency: {mr.frequencyCron === '0 9 * * *' ? 'Once daily' : mr.frequencyCron === '0 9,21 * * *' ? 'Twice daily' : mr.frequencyCron === '0 9,15,21 * * *' ? 'Three times daily' : mr.frequencyCron === '0 */6 * * *' ? 'Every 6 hours' : mr.frequencyCron === '0 */8 * * *' ? 'Every 8 hours' : 'Weekly'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
