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
import { adminApi } from '@/services/api/adminApi';
import { getErrorMessage } from '@/utils/formatters';

type Tab = 'metrics' | 'users' | 'doctors' | 'leaves' | 'audit';
type DoctorSubTab = 'profile' | 'hours' | 'leaves';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WorkingHourInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('metrics');
  const qc = useQueryClient();

  // Doctor List and Selection State
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorSubTab, setDoctorSubTab] = useState<DoctorSubTab>('profile');
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);

  // Doctor Form State
  const [newDoctor, setNewDoctor] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    specialty: '',
    licenseNumber: '',
    bio: '',
    slotDurationMinutes: 30,
  });

  // Selected Doctor Edit Form State
  const [editDoctor, setEditDoctor] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    licenseNumber: '',
    bio: '',
    slotDurationMinutes: 30,
    isAvailable: true,
  });

  // Working Hours State (Array of 7 days)
  const [workingHoursForm, setWorkingHoursForm] = useState<WorkingHourInput[]>(
    DAY_NAMES.map((_, index) => ({
      dayOfWeek: index,
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
      isActive: false,
    }))
  );

  // New Leave Form State
  const [newLeave, setNewLeave] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Query Definitions
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminApi.getMetrics().then((r) => r.data.data as {
      activeUsers: number;
      totalAppointments: number;
      pendingLeaves: number;
      activeReminders: number;
    }),
    enabled: tab === 'metrics',
    refetchInterval: 30000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getUsers().then((r) => r.data.data),
    enabled: tab === 'users',
  });

  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ['admin-leaves'],
    queryFn: () => adminApi.getPendingLeaves().then((r) => r.data.data as Array<{
      id: string;
      startDate: string;
      endDate: string;
      reason: string | null;
      status: string;
      doctor: { firstName: string; lastName: string; specialty: string };
    }>),
    enabled: tab === 'leaves',
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminApi.getAuditLogs({ limit: 50 }).then((r) => r.data.data as {
      logs: Array<{ id: string; action: string; resourceType: string; resourceId: string | null; ipAddress: string | null; createdAt: string; user: { email: string; role: string } | null }>;
      total: number;
    }),
    enabled: tab === 'audit',
  });

  // Doctors Query
  const { data: doctorsList, isLoading: doctorsLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: () => adminApi.listDoctors().then((r) => r.data.data as Array<{
      id: string;
      firstName: string;
      lastName: string;
      specialty: string;
      licenseNumber: string | null;
      bio: string | null;
      slotDurationMinutes: number;
      isAvailable: boolean;
      rating: number;
      user: { email: string; isDeleted: boolean };
    }>),
    enabled: tab === 'doctors',
  });

  // Working Hours Query
  const { isFetching: hoursLoading } = useQuery({
    queryKey: ['doctor-working-hours', selectedDoctorId],
    queryFn: () => adminApi.getDoctorWorkingHours(selectedDoctorId!).then((r) => {
      const dbHours = r.data.data as Array<{ dayOfWeek: number; startTime: string; endTime: string; slotDurationMinutes: number; isActive: boolean }>;
      const mapped = DAY_NAMES.map((_, index) => {
        const found = dbHours.find((h) => h.dayOfWeek === index);
        return {
          dayOfWeek: index,
          startTime: found?.startTime ?? '09:00',
          endTime: found?.endTime ?? '17:00',
          slotDurationMinutes: found?.slotDurationMinutes ?? 30,
          isActive: !!found,
        };
      });
      setWorkingHoursForm(mapped);
      return dbHours;
    }),
    enabled: tab === 'doctors' && !!selectedDoctorId && doctorSubTab === 'hours',
  });

  // Doctor Leaves Query
  const { data: doctorLeaves, isLoading: doctorLeavesLoading } = useQuery({
    queryKey: ['doctor-leaves', selectedDoctorId],
    queryFn: () => adminApi.getDoctorLeaves(selectedDoctorId!).then((r) => r.data.data as Array<{
      id: string;
      startDate: string;
      endDate: string;
      reason: string | null;
      status: string;
    }>),
    enabled: tab === 'doctors' && !!selectedDoctorId && doctorSubTab === 'leaves',
  });

  // Mutations
  const disableMutation = useMutation({
    mutationFn: (id: string) => adminApi.disableUser(id),
    onSuccess: () => { toast.success('User disabled.'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const approveMutation = useMutation({
    mutationFn: (leaveId: string) => adminApi.approveLeave(leaveId),
    onSuccess: () => { toast.success('Leave approved — affected appointments cancelled.'); qc.invalidateQueries({ queryKey: ['admin-leaves'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createDoctorMutation = useMutation({
    mutationFn: () => adminApi.createDoctor(newDoctor),
    onSuccess: () => {
      toast.success('Doctor account created successfully.');
      setIsAddingDoctor(false);
      setNewDoctor({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        specialty: '',
        licenseNumber: '',
        bio: '',
        slotDurationMinutes: 30,
      });
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateDoctorMutation = useMutation({
    mutationFn: () => adminApi.updateDoctor(selectedDoctorId!, editDoctor),
    onSuccess: () => {
      toast.success('Doctor profile updated.');
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateHoursMutation = useMutation({
    mutationFn: () => {
      const activeOnly = workingHoursForm.filter((h) => h.isActive);
      return adminApi.updateDoctorWorkingHours(selectedDoctorId!, activeOnly);
    },
    onSuccess: () => toast.success('Doctor working hours successfully updated.'),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createLeaveMutation = useMutation({
    mutationFn: () => adminApi.createDoctorLeave(selectedDoctorId!, newLeave),
    onSuccess: (res) => {
      const cancelledCount = res.data.data?.cancelledAppointments ?? 0;
      toast.success(`Leave approved! Overlapping appointments cancelled: ${cancelledCount}`);
      setNewLeave({ startDate: '', endDate: '', reason: '' });
      qc.invalidateQueries({ queryKey: ['doctor-leaves', selectedDoctorId] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const selectedDoctor = doctorsList?.find((d) => d.id === selectedDoctorId);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'metrics',
      label: 'Metrics',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'doctors',
      label: 'Doctors',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'leaves',
      label: 'Leave Approvals',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'User Management',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'audit',
      label: 'Audit Log',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const filteredDoctors = doctorsList?.filter(
    (d) =>
      `${d.firstName} ${d.lastName}`.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialty.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const handleSelectDoctor = (doc: any) => {
    if (!doc) return;
    setSelectedDoctorId(doc.id);
    setEditDoctor({
      firstName: doc.firstName,
      lastName: doc.lastName,
      specialty: doc.specialty,
      licenseNumber: doc.licenseNumber ?? '',
      bio: doc.bio ?? '',
      slotDurationMinutes: doc.slotDurationMinutes,
      isAvailable: doc.isAvailable,
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      <Navbar title="Admin Operations" />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 flex-1">
        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── METRICS ── */}
          {tab === 'metrics' && (
            <motion.div key="metrics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {metricsLoading && <LoadingSpinner className="py-12" />}
              {metrics && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Active Users', value: metrics.activeUsers, variant: 'info' as const, desc: 'Registered user accounts' },
                    { label: 'Total Appointments', value: metrics.totalAppointments, variant: 'success' as const, desc: 'Active appointments in DB' },
                    { label: 'Pending Leaves', value: metrics.pendingLeaves, variant: 'warning' as const, desc: 'Leave days awaiting approval' },
                    { label: 'Active Reminders', value: metrics.activeReminders, variant: 'default' as const, desc: 'Automated dosage logs' },
                  ].map((m) => (
                    <Card key={m.label} className="flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{m.label}</p>
                        <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--text-primary)]">{m.value}</p>
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">{m.desc}</p>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── DOCTOR PROFILES & MANAGEMENT ── */}
          {tab === 'doctors' && (
            <motion.div
              key="doctors"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 lg:grid-cols-12"
            >
              {/* Left Column - Doctor List */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">Doctor Profiles</h2>
                    <Button size="sm" onClick={() => setIsAddingDoctor(true)}>
                      + Add Doctor
                    </Button>
                  </div>
                  <Input
                    placeholder="Filter by name or specialty..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                  />
                </Card>

                <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
                  {doctorsLoading && <LoadingSpinner className="py-12" />}

                  {filteredDoctors && filteredDoctors.length === 0 && (
                    <Card className="text-center py-8 text-sm text-[var(--text-secondary)]">
                      No doctor profiles found.
                    </Card>
                  )}

                  {filteredDoctors?.map((d) => (
                    <motion.div
                      key={d.id}
                      onClick={() => handleSelectDoctor(d)}
                      className={`cursor-pointer rounded-[var(--radius-card)] border p-4 transition-all hover:translate-x-1 ${
                        selectedDoctorId === d.id
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 shadow-sm'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">Dr. {d.firstName} {d.lastName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{d.specialty}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-70">
                            License: {d.licenseNumber ?? 'N/A'}
                          </p>
                        </div>
                        <Badge variant={d.isAvailable ? 'success' : 'default'}>
                          {d.isAvailable ? 'Active' : 'Unavailable'}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right Column - Details and Forms */}
              <div className="lg:col-span-8">
                {selectedDoctor ? (
                  <Card className="flex flex-col gap-6 min-h-[500px]">
                    <div className="border-b border-[var(--border-subtle)] pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                          </h2>
                          <p className="text-sm text-[var(--text-secondary)]">{selectedDoctor.specialty} · {selectedDoctor.user.email}</p>
                        </div>
                        <Badge variant={selectedDoctor.isAvailable ? 'success' : 'default'}>
                          {selectedDoctor.isAvailable ? 'Available' : 'On Leave / Offline'}
                        </Badge>
                      </div>

                      {/* Doctor Sub Tabs */}
                      <div className="mt-4 flex gap-2 border-t border-[var(--border-subtle)] pt-3">
                        {(['profile', 'hours', 'leaves'] as DoctorSubTab[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => setDoctorSubTab(st)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                              doctorSubTab === st
                                ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/5'
                            }`}
                          >
                            {st === 'profile' && 'Profile details'}
                            {st === 'hours' && 'Working hours'}
                            {st === 'leaves' && 'Leave scheduling'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1">
                      {/* SUB TAB: PROFILE DETAILS */}
                      {doctorSubTab === 'profile' && (
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                              label="First Name"
                              value={editDoctor.firstName}
                              onChange={(e) => setEditDoctor({ ...editDoctor, firstName: e.target.value })}
                            />
                            <Input
                              label="Last Name"
                              value={editDoctor.lastName}
                              onChange={(e) => setEditDoctor({ ...editDoctor, lastName: e.target.value })}
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                              label="Specialty"
                              value={editDoctor.specialty}
                              onChange={(e) => setEditDoctor({ ...editDoctor, specialty: e.target.value })}
                            />
                            <Input
                              label="License Number"
                              value={editDoctor.licenseNumber}
                              onChange={(e) => setEditDoctor({ ...editDoctor, licenseNumber: e.target.value })}
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                              label="Slot Duration (Minutes)"
                              type="number"
                              value={editDoctor.slotDurationMinutes}
                              onChange={(e) => setEditDoctor({ ...editDoctor, slotDurationMinutes: parseInt(e.target.value) || 30 })}
                            />
                            <div className="flex flex-col justify-end pb-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editDoctor.isAvailable}
                                  onChange={(e) => setEditDoctor({ ...editDoctor, isAvailable: e.target.checked })}
                                  className="h-4 w-4 rounded border-[var(--border-subtle)] accent-[var(--brand-primary)]"
                                />
                                <span className="text-sm font-medium text-[var(--text-primary)]">Profile Active / Booking Enabled</span>
                              </label>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Biography</label>
                            <textarea
                              value={editDoctor.bio}
                              onChange={(e) => setEditDoctor({ ...editDoctor, bio: e.target.value })}
                              rows={4}
                              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                              placeholder="Doctor background, clinical experience..."
                            />
                          </div>

                          <Button
                            className="mt-2 w-full sm:w-auto"
                            isLoading={updateDoctorMutation.isPending}
                            onClick={() => updateDoctorMutation.mutate()}
                          >
                            Save Profile Changes
                          </Button>
                        </div>
                      )}

                      {/* SUB TAB: WORKING HOURS */}
                      {doctorSubTab === 'hours' && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Manage Working Hours</h3>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Select the days of the week when this doctor is active and configure their schedule duration.
                          </p>

                          {hoursLoading ? (
                            <LoadingSpinner className="py-6" />
                          ) : (
                            <div className="space-y-3">
                              {workingHoursForm.map((day, idx) => (
                                <div
                                  key={day.dayOfWeek}
                                  className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]/30 p-3"
                                >
                                  <label className="flex min-w-[120px] items-center gap-2 cursor-pointer font-medium text-[var(--text-primary)] text-sm">
                                    <input
                                      type="checkbox"
                                      checked={day.isActive}
                                      onChange={(e) => {
                                        const next = [...workingHoursForm];
                                        next[idx].isActive = e.target.checked;
                                        setWorkingHoursForm(next);
                                      }}
                                      className="h-4 w-4 rounded border-[var(--border-subtle)] accent-[var(--brand-primary)]"
                                    />
                                    {DAY_NAMES[day.dayOfWeek]}
                                  </label>

                                  {day.isActive && (
                                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                      <input
                                        type="time"
                                        value={day.startTime}
                                        onChange={(e) => {
                                          const next = [...workingHoursForm];
                                          next[idx].startTime = e.target.value;
                                          setWorkingHoursForm(next);
                                        }}
                                        className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                                      />
                                      <span className="text-xs text-[var(--text-secondary)]">to</span>
                                      <input
                                        type="time"
                                        value={day.endTime}
                                        onChange={(e) => {
                                          const next = [...workingHoursForm];
                                          next[idx].endTime = e.target.value;
                                          setWorkingHoursForm(next);
                                        }}
                                        className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}

                              <Button
                                className="mt-4 w-full sm:w-auto"
                                isLoading={updateHoursMutation.isPending}
                                onClick={() => updateHoursMutation.mutate()}
                              >
                                Save Working Hours
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB TAB: LEAVES */}
                      {doctorSubTab === 'leaves' && (
                        <div className="space-y-6">
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* Schedule Leave Form */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Schedule Leave Day</h3>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                Approved leaves automatically cancel any overlapping patient appointments, send out email alerts, and sync updates to Google Calendar.
                              </p>

                              <Input
                                label="Start Date"
                                type="date"
                                value={newLeave.startDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                              />

                              <Input
                                label="End Date"
                                type="date"
                                value={newLeave.endDate}
                                min={newLeave.startDate || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                              />

                              <Input
                                label="Reason / Notes"
                                placeholder="Vacation, conference, personal leave..."
                                value={newLeave.reason}
                                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                              />

                              <Button
                                className="w-full"
                                isLoading={createLeaveMutation.isPending}
                                onClick={() => createLeaveMutation.mutate()}
                              >
                                Approve Leave Day
                              </Button>
                            </div>

                            {/* Leaves Logs */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Approved Leaves Log</h3>

                              {doctorLeavesLoading && <LoadingSpinner className="py-6" />}

                              {doctorLeaves && doctorLeaves.length === 0 && (
                                <p className="text-xs text-[var(--text-secondary)] italic py-4">
                                  No leave records logged.
                                </p>
                              )}

                              <div className="space-y-2 overflow-y-auto max-h-[300px]">
                                {doctorLeaves?.map((l) => (
                                  <div
                                    key={l.id}
                                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-xs"
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-semibold text-[var(--text-primary)]">
                                        {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                      </span>
                                      <Badge variant={l.status === 'APPROVED' ? 'success' : 'warning'}>{l.status}</Badge>
                                    </div>
                                    <p className="text-[var(--text-secondary)] italic">"{l.reason || 'No reason provided'}"</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="flex flex-col items-center justify-center text-center p-12 min-h-[500px]">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">No doctor selected</h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                      Select a doctor from the list to manage details, set working hours, or add leave days.
                    </p>
                  </Card>
                )}
              </div>
            </motion.div>
          )}

          {/* ── LEAVE APPROVALS FROM DOCTOR SUBMISSIONS ── */}
          {tab === 'leaves' && (
            <motion.div key="leaves" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {leavesLoading && <LoadingSpinner className="py-8" />}
              {leavesData && leavesData.length === 0 && (
                <Card>
                  <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No pending doctor leave requests.</p>
                </Card>
              )}
              {leavesData && leavesData.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {leavesData.map((l) => (
                    <Card key={l.id} className="flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">
                              Dr. {l.doctor.firstName} {l.doctor.lastName}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">{l.doctor.specialty}</p>
                          </div>
                          <Badge variant="warning">{l.status}</Badge>
                        </div>
                        <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                          Schedule: {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                        </p>
                        {l.reason && <p className="mt-2 text-xs text-[var(--text-secondary)] italic">"{l.reason}"</p>}
                      </div>
                      <Button
                        className="w-full text-xs"
                        isLoading={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(l.id)}
                      >
                        Approve Leave & Cancel Overlaps
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── SYSTEM USER LIST ── */}
          {tab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {usersLoading && <LoadingSpinner className="py-8" />}
              {usersData?.users && (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                          <th className="pb-3 pr-4">Email</th>
                          <th className="pb-3 pr-4">Role</th>
                          <th className="pb-3 pr-4">Verified</th>
                          <th className="pb-3 pr-4">Joined</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {usersData.users.map((u: { id: string; email: string; role: string; isEmailVerified: boolean; createdAt: string }) => (
                          <tr key={u.id} className="text-[var(--text-primary)]">
                            <td className="py-3.5 pr-4 font-medium">{u.email}</td>
                            <td className="py-3.5 pr-4">
                              <Badge variant={u.role === 'ADMIN' ? 'danger' : u.role === 'DOCTOR' ? 'info' : 'success'}>{u.role}</Badge>
                            </td>
                            <td className="py-3.5 pr-4">{u.isEmailVerified ? '✓ Yes' : 'No'}</td>
                            <td className="py-3.5 pr-4 text-xs text-[var(--text-secondary)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="py-3.5 text-right">
                              <Button variant="danger" size="sm" onClick={() => disableMutation.mutate(u.id)}>
                                Disable Account
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* ── SYSTEM AUDIT TRAIL ── */}
          {tab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {auditLoading && <LoadingSpinner className="py-8" />}
              {auditData && (
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">System Audit Log</h2>
                    <span className="text-xs font-semibold text-[var(--text-secondary)] bg-[var(--border-subtle)]/10 px-2.5 py-1 rounded-full">
                      {auditData.total} items
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-xs overflow-y-auto max-h-[500px] pr-2">
                    {auditData.logs.map((log) => (
                      <div key={log.id} className="flex flex-wrap items-center gap-3 rounded py-2 hover:bg-[var(--border-subtle)]/5 px-3 border border-transparent hover:border-[var(--border-subtle)]/10 transition-all">
                        <span className="text-[var(--text-secondary)] opacity-60">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        <span className="text-[var(--brand-primary)] font-bold">{log.action}</span>
                        <span className="text-[var(--text-secondary)] px-1 py-0.5 rounded bg-[var(--border-subtle)]/10">{log.resourceType}</span>
                        <span className="text-[var(--text-primary)] font-semibold">{log.user?.email ?? 'anonymous'}</span>
                        <span className="text-xs text-[var(--text-secondary)] opacity-60 ml-auto">{log.ipAddress ?? 'no-ip'}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />

      {/* MODAL OVERLAY: ADD DOCTOR PROFILE */}
      <AnimatePresence>
        {isAddingDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4">
                <h3 className="text-base font-bold text-[var(--text-primary)]">Add Doctor Profile</h3>
                <button
                  onClick={() => setIsAddingDoctor(false)}
                  className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/10 hover:text-[var(--text-primary)]"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="First Name"
                    required
                    value={newDoctor.firstName}
                    onChange={(e) => setNewDoctor({ ...newDoctor, firstName: e.target.value })}
                  />
                  <Input
                    label="Last Name"
                    required
                    value={newDoctor.lastName}
                    onChange={(e) => setNewDoctor({ ...newDoctor, lastName: e.target.value })}
                  />
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={newDoctor.email}
                  onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                />

                <Input
                  label="Account Password"
                  type="password"
                  required
                  value={newDoctor.password}
                  onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Specialty"
                    required
                    placeholder="Cardiology, Pediatrics..."
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                  />
                  <Input
                    label="License Number"
                    placeholder="LIC-12345"
                    value={newDoctor.licenseNumber}
                    onChange={(e) => setNewDoctor({ ...newDoctor, licenseNumber: e.target.value })}
                  />
                </div>

                <Input
                  label="Default Slot Duration (Minutes)"
                  type="number"
                  value={newDoctor.slotDurationMinutes}
                  onChange={(e) => setNewDoctor({ ...newDoctor, slotDurationMinutes: parseInt(e.target.value) || 30 })}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Biography / Notes</label>
                  <textarea
                    value={newDoctor.bio}
                    onChange={(e) => setNewDoctor({ ...newDoctor, bio: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                    placeholder="Short doctor bio details..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
                <Button variant="secondary" onClick={() => setIsAddingDoctor(false)}>
                  Cancel
                </Button>
                <Button
                  isLoading={createDoctorMutation.isPending}
                  onClick={() => createDoctorMutation.mutate()}
                >
                  Create Profile
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
