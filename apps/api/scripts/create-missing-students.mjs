// Provision and sync student accounts:
// 1. student14@school.invalid: يزن سلطان جيلاني إقبال (reset temp password + mustChangePassword)
// 2. student15@school.invalid: حسن إسماعيل محمد كامل عيسى (mustChangePassword)
// 3. student16@school.invalid: بتال عارف (create + mustChangePassword)
// 4. Enforce mustChangePassword for all school students on first login

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '')) {
  throw new Error('DATABASE_URL is not a valid PostgreSQL URL — aborting.');
}
if (process.env.PUBLIC_SCHOOL_SLUG !== 'al-ikhlas-jeddah') {
  throw new Error(`Expected PUBLIC_SCHOOL_SLUG=al-ikhlas-jeddah, got ${process.env.PUBLIC_SCHOOL_SLUG} — aborting.`);
}

const TEMP_PASSWORD = 'NexusTemp@2026!';

const TARGET_STUDENTS = [
  {
    email: 'student14@school.invalid',
    name: 'يزن سلطان جيلاني إقبال',
  },
  {
    email: 'student15@school.invalid',
    name: 'حسن إسماعيل محمد كامل عيسى',
  },
  {
    email: 'student16@school.invalid',
    name: 'بتال عارف',
  },
];

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findUnique({
    where: { slug: 'al-ikhlas-jeddah' },
    select: { id: true, isActive: true },
  });
  if (!school?.isActive) throw new Error('School al-ikhlas-jeddah not found or inactive.');

  const hashedPassword = await bcrypt.hash(TEMP_PASSWORD, 10);
  const results = [];

  for (const student of TARGET_STUDENTS) {
    const existing = await prisma.user.findUnique({
      where: { email: student.email },
      select: { id: true, email: true, name: true },
    });

    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: student.name,
          password: hashedPassword,
          mustChangePassword: true,
          emailVerified: true,
          isActive: true,
        },
        select: { id: true, email: true, name: true, mustChangePassword: true },
      });

      // Revoke any old refresh tokens
      await prisma.refreshToken.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      console.log(`🔄 Updated: ${updated.email} — ${updated.name} (password reset, mustChangePassword=true)`);
      results.push({ status: 'updated', email: updated.email, name: updated.name });
    } else {
      const created = await prisma.user.create({
        data: {
          email: student.email,
          name: student.name,
          password: hashedPassword,
          role: Role.STUDENT,
          schoolId: school.id,
          emailVerified: true,
          mustChangePassword: true,
          isActive: true,
        },
        select: { id: true, email: true, name: true, mustChangePassword: true },
      });

      await prisma.auditLog.create({
        data: {
          schoolId: school.id,
          action: 'user.admin_provisioned',
          entityType: 'user',
          entityId: created.id,
          metadata: { email: created.email, name: created.name, role: 'STUDENT', provisioner: 'create-missing-students.mjs' },
        },
      }).catch(() => {});

      console.log(`✅ Created: ${created.email} — ${created.name} (mustChangePassword=true)`);
      results.push({ status: 'created', email: created.email, name: created.name });
    }
  }

  // Ensure all student accounts in the school require first-login password change
  const studentPasswordUpdate = await prisma.user.updateMany({
    where: {
      schoolId: school.id,
      role: Role.STUDENT,
      email: { endsWith: '@school.invalid' },
    },
    data: {
      mustChangePassword: true,
      emailVerified: true,
    },
  });
  console.log(`📋 Enforced mustChangePassword on ${studentPasswordUpdate.count} student accounts.`);

  console.log('\nSummary:', JSON.stringify(results, null, 2));
  console.log(`\nNote: Temp password for students 14, 15, 16 is: ${TEMP_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('❌ student provisioning failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
