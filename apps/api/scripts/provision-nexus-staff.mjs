import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const schoolSlug = 'al-ikhlas-jeddah';
const accounts = [
  { email: 'principal@nexus.masarplatform.org', name: 'خالد عبدالعزيز الحربي', role: Role.PRINCIPAL },
  { email: 'viceprincipal@nexus.masarplatform.org', name: 'نورة فهد العتيبي', role: Role.VICE_PRINCIPAL },
  { email: 'counselor@nexus.masarplatform.org', name: 'سارة محمد القحطاني', role: Role.COUNSELOR },
  { email: 'supervisor@nexus.masarplatform.org', name: 'أحمد عبدالله الزهراني', role: Role.SUPERVISOR },
  { email: 'admin.affairs@nexus.masarplatform.org', name: 'ريم صالح الحربي', role: Role.ADMIN },
  { email: 'finance@nexus.masarplatform.org', name: 'فهد ناصر الغامدي', role: Role.ACCOUNTANT },
  { email: 'hr@nexus.masarplatform.org', name: 'منى عبدالرحمن الدوسري', role: Role.HR },
];
const sharedPassword = process.env.NEXUS_STAFF_PASSWORD;
const disableTeacherAccounts = process.env.DISABLE_TEACHER_ACCOUNTS === 'YES';

if (process.env.CONFIRM_NEXUS_STAFF_PROVISION !== 'YES') {
  throw new Error('Set CONFIRM_NEXUS_STAFF_PROVISION=YES to create the staff accounts.');
}
if (process.env.PUBLIC_SCHOOL_SLUG !== schoolSlug) {
  throw new Error(`Expected PUBLIC_SCHOOL_SLUG=${schoolSlug}; refusing to use another school.`);
}
if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '')) {
  throw new Error('DATABASE_URL is not a valid PostgreSQL URL.');
}
if (typeof sharedPassword !== 'string' || Buffer.byteLength(sharedPassword, 'utf8') < 20 || Buffer.byteLength(sharedPassword, 'utf8') > 72) {
  throw new Error('NEXUS_STAFF_PASSWORD must be 20-72 bytes for the shared initial password.');
}

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findUnique({ where: { slug: schoolSlug }, select: { id: true, isActive: true } });
  if (!school?.isActive) throw new Error('The target school is missing or inactive.');

  const existing = await prisma.user.findMany({
    where: { email: { in: accounts.map((account) => account.email) } },
    select: { id: true, email: true, role: true, schoolId: true, isActive: true },
  });
  const existingByEmail = new Map(existing.map((user) => [user.email, user]));
  for (const account of accounts) {
    const user = existingByEmail.get(account.email);
    if (user && (user.role !== account.role || user.schoolId !== school.id || !user.isActive)) {
      throw new Error(`Refusing to alter an account with the wrong role, school, or status: ${account.email}`);
    }
  }

  const password = await bcrypt.hash(sharedPassword, 12);
  const created = [];
  const updated = [];
  const teacherUsers = disableTeacherAccounts
    ? await prisma.user.findMany({
        where: { schoolId: school.id, role: Role.TEACHER },
        select: { id: true },
      })
    : [];
  const schoolClasses = disableTeacherAccounts
    ? await prisma.class.findMany({
        where: { schoolId: school.id },
        select: { id: true },
      })
    : [];
  const teacherIds = teacherUsers.map(({ id }) => id);
  const classIds = schoolClasses.map(({ id }) => id);
  let teacherAccountsDisabled = 0;
  let teacherSessionsRevoked = 0;
  let classAssignmentsCleared = 0;
  let subjectAssignmentsCleared = 0;
  let classSubjectAssignmentsCleared = 0;

  await prisma.$transaction(async (tx) => {
    if (teacherIds.length) {
      const [disabled, revoked, classes, subjects, classSubjects] = await Promise.all([
        tx.user.updateMany({
          where: { id: { in: teacherIds }, isActive: true },
          data: { isActive: false },
        }),
        tx.refreshToken.updateMany({
          where: { userId: { in: teacherIds }, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        tx.class.updateMany({
          where: { schoolId: school.id, teacherId: { in: teacherIds } },
          data: { teacherId: null },
        }),
        tx.subject.updateMany({
          where: { schoolId: school.id, teacherId: { in: teacherIds } },
          data: { teacherId: null },
        }),
        classIds.length
          ? tx.classSubject.updateMany({
              where: { classId: { in: classIds }, teacherId: { in: teacherIds } },
              data: { teacherId: null },
            })
          : Promise.resolve({ count: 0 }),
      ]);
      teacherAccountsDisabled = disabled.count;
      teacherSessionsRevoked = revoked.count;
      classAssignmentsCleared = classes.count;
      subjectAssignmentsCleared = subjects.count;
      classSubjectAssignmentsCleared = classSubjects.count;

      if (disabled.count || revoked.count || classes.count || subjects.count || classSubjects.count) {
        await tx.auditLog.create({
          data: {
            schoolId: school.id,
            action: 'accounts.teacher_access_revoked',
            entityType: 'user',
            metadata: {
              teacherAccountsDisabled: disabled.count,
              teacherSessionsRevoked: revoked.count,
              classAssignmentsCleared: classes.count,
              subjectAssignmentsCleared: subjects.count,
              classSubjectAssignmentsCleared: classSubjects.count,
              mode: 'soft_disable_preserving_school_records',
            },
          },
        });
      }
    }

    for (const account of accounts) {
      const data = { name: account.name, role: account.role, schoolId: school.id, password, emailVerified: true, isActive: true };
      const user = existingByEmail.get(account.email);
      if (user) {
        await tx.user.update({ where: { id: user.id }, data: { name: account.name, password, emailVerified: true } });
        await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
        updated.push(account);
      } else {
        await tx.user.create({ data: { email: account.email, ...data } });
        created.push(account);
      }
    }
  });

  console.log(JSON.stringify({
    school: schoolSlug,
    created,
    passwordUpdated: updated,
    teacherAccountsDisabled,
    teacherSessionsRevoked,
    classAssignmentsCleared,
    subjectAssignmentsCleared,
    classSubjectAssignmentsCleared,
    note: 'These Nexus login IDs do not create email mailboxes. The password is intentionally omitted from output.',
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Staff account provisioning failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
