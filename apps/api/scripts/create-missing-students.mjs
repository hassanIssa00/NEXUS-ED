// One-time script: create missing student accounts
// Runs in the Vercel environment where DATABASE_URL is available via process.env
// Safe to run multiple times (upsert-style: skips existing emails)

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '')) {
  throw new Error('DATABASE_URL is not a valid PostgreSQL URL — aborting.');
}
if (process.env.PUBLIC_SCHOOL_SLUG !== 'al-ikhlas-jeddah') {
  throw new Error(`Expected PUBLIC_SCHOOL_SLUG=al-ikhlas-jeddah, got ${process.env.PUBLIC_SCHOOL_SLUG} — aborting.`);
}

const STUDENTS = [
  {
    email: 'student14@school.invalid',
    name: 'يزن سلطان جيلاني إقبال',
    // Temporary password — student MUST change it on first login (mustChangePassword=true)
    tempPassword: 'NexusTemp@2026!',
  },
  {
    email: 'student15@school.invalid',
    name: 'حسن إسماعيل محمد كامل عيسى',
    tempPassword: 'NexusTemp@2026!',
  },
];

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findUnique({
    where: { slug: 'al-ikhlas-jeddah' },
    select: { id: true, isActive: true },
  });
  if (!school?.isActive) throw new Error('School not found or inactive.');

  const results = [];

  for (const student of STUDENTS) {
    const existing = await prisma.user.findUnique({
      where: { email: student.email },
      select: { id: true, email: true, name: true },
    });

    if (existing) {
      console.log(`⏭️  Skipped (already exists): ${student.email} — ${existing.name}`);
      results.push({ status: 'skipped', email: student.email, name: existing.name });
      continue;
    }

    const hashedPassword = await bcrypt.hash(student.tempPassword, 10);

    const created = await prisma.user.create({
      data: {
        email: student.email,
        name: student.name,
        password: hashedPassword,
        role: Role.STUDENT,
        schoolId: school.id,
        emailVerified: true,       // Admin-provisioned: no Firebase flow needed
        mustChangePassword: true,  // Must set a personal password on first login
        isActive: true,
      },
      select: { id: true, email: true, name: true },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        action: 'user.admin_provisioned',
        entityType: 'user',
        entityId: created.id,
        metadata: { email: created.email, name: created.name, role: 'STUDENT', provisioner: 'create-missing-students.mjs' },
      },
    }).catch(() => {}); // audit log is best-effort

    console.log(`✅ Created: ${student.email} — ${student.name}`);
    results.push({ status: 'created', email: student.email, name: student.name });
  }

  console.log('\nSummary:', JSON.stringify(results, null, 2));
  console.log('\nNote: Temp password for both accounts is NexusTemp@2026! — students must change it on first login.');
}

main()
  .catch((err) => {
    console.error('❌ create-missing-students failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
