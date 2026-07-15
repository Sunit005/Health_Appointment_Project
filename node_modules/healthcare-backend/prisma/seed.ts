import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

async function main() {
  console.log('🌱 Starting database seed…');

  // Clear existing data to ensure a clean state
  console.log('🧹 Cleaning existing data...');
  await prisma.doctorWorkingHour.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const adminPasswordHash = await argon2.hash('Admin123!', ARGON2_OPTIONS);
  const patientPasswordHash = await argon2.hash('Patient123!', ARGON2_OPTIONS);
  const doctorPasswordHash = await argon2.hash('Doctor123!', ARGON2_OPTIONS);

  // ── Admin ──────────────────────────────────────────────────
  const adminEmail = 'admin@healthcare.dev';
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });
  console.log(`✅ Admin created: ${adminEmail} / Admin123!`);

  // ── Patient ────────────────────────────────────────────────
  const patientEmail = 'patient@healthcare.dev';
  const patientUser = await prisma.user.create({
    data: {
      email: patientEmail,
      passwordHash: patientPasswordHash,
      role: 'PATIENT',
      isEmailVerified: true,
    },
  });

  await prisma.patient.create({
    data: {
      userId: patientUser.id,
      firstName: 'John',
      lastName: 'Doe',
      dob: new Date('1990-05-15'),
      phoneNumber: '+1234567890',
    },
  });
  console.log(`✅ Patient created: ${patientEmail} / Patient123!`);

  // ── Doctors ─────────────────────────────────────────────────
  const doctorsData = [
    {
      email: 'aarav.sharma@healthcare.dev',
      firstName: 'Aarav',
      lastName: 'Sharma',
      specialty: 'Cardiology',
      licenseNumber: 'LIC-2024-001',
      bio: 'Board-certified cardiologist with 10 years of experience in cardiology.',
    },
    {
      email: 'ananya.patel@healthcare.dev',
      firstName: 'Ananya',
      lastName: 'Patel',
      specialty: 'Dermatology',
      licenseNumber: 'LIC-2024-002',
      bio: 'Specialist in clinical and cosmetic dermatology.',
    },
    {
      email: 'rohan.gupta@healthcare.dev',
      firstName: 'Rohan',
      lastName: 'Gupta',
      specialty: 'Pediatrics',
      licenseNumber: 'LIC-2024-003',
      bio: 'Dedicated pediatrician focusing on preventive child health.',
    },
    {
      email: 'priya.iyer@healthcare.dev',
      firstName: 'Priya',
      lastName: 'Iyer',
      specialty: 'General Medicine',
      licenseNumber: 'LIC-2024-004',
      bio: 'Family physician with a holistic approach to patient care.',
    },
    {
      email: 'amit.verma@healthcare.dev',
      firstName: 'Amit',
      lastName: 'Verma',
      specialty: 'Neurology',
      licenseNumber: 'LIC-2024-005',
      bio: 'Neurologist specializing in headache disorders and sleep medicine.',
    },
    {
      email: 'sanjay.reddy@healthcare.dev',
      firstName: 'Sanjay',
      lastName: 'Reddy',
      specialty: 'Orthopedics',
      licenseNumber: 'LIC-2024-006',
      bio: 'Orthopedic surgeon focusing on sports injuries and joint replacement.',
    },
  ];

  for (const doc of doctorsData) {
    const docUser = await prisma.user.create({
      data: {
        email: doc.email,
        passwordHash: doctorPasswordHash,
        role: 'DOCTOR',
        isEmailVerified: true,
      },
    });

    const doctorProfile = await prisma.doctor.create({
      data: {
        userId: docUser.id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        specialty: doc.specialty,
        licenseNumber: doc.licenseNumber,
        bio: doc.bio,
        slotDurationMinutes: 30,
        isAvailable: true,
      },
    });

    // Add working hours Mon–Fri 9:00–17:00
    await prisma.doctorWorkingHour.createMany({
      data: [1, 2, 3, 4, 5].map((day) => ({
        doctorId: doctorProfile.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
      })),
    });

    console.log(`✅ Doctor created: ${doc.firstName} ${doc.lastName} (${doc.specialty}) - ${doc.email}`);
  }

  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
