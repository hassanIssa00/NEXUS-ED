// Fix student name: student14@school.invalid
// Change from "برزن سلطان جيلاني إقبال" to "يزن سلطان جيلاني إقبال"

import { PrismaClient } from '@prisma/client';

if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '')) {
  throw new Error('DATABASE_URL is not a valid PostgreSQL URL.');
}

const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'student14@school.invalid';
  const wrongName = 'برزن سلطان جيلاني إقبال';
  const correctName = 'يزن سلطان جيلاني إقبال';

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, name: true, email: true, schoolId: true },
  });

  if (!user) {
    console.log(`❌ User not found: ${targetEmail}`);
    return;
  }

  console.log(`Found: ${user.email} — current name: "${user.name}"`);

  if (user.name === correctName) {
    console.log('✅ Name already correct, nothing to do.');
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: correctName },
  });

  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId ?? undefined,
      action: 'user.name_corrected',
      entityType: 'user',
      entityId: user.id,
      metadata: { previousName: user.name, newName: correctName, reason: 'typo correction via fix-student-name.mjs' },
    },
  }).catch(() => {});

  console.log(`✅ Name updated: "${user.name}" → "${correctName}"`);
}

main()
  .catch((err) => {
    console.error('❌ fix-student-name failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
