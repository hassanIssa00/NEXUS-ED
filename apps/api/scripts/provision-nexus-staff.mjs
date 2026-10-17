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
let suppliedPasswords;
try {
  suppliedPasswords = JSON.parse(process.env.NEXUS_STAFF_PASSWORDS_JSON || '{}');
} catch {
  throw new Error('NEXUS_STAFF_PASSWORDS_JSON must be valid JSON.');
}

if (process.env.CONFIRM_NEXUS_STAFF_PROVISION !== 'YES') {
  throw new Error('Set CONFIRM_NEXUS_STAFF_PROVISION=YES to create the staff accounts.');
}
if (process.env.PUBLIC_SCHOOL_SLUG !== schoolSlug) {
  throw new Error(`Expected PUBLIC_SCHOOL_SLUG=${schoolSlug}; refusing to use another school.`);
}
if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '')) {
  throw new Error('DATABASE_URL is not a valid PostgreSQL URL.');
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
      throw new Error(`Existing account conflicts with the requested role or school: ${account.email}`);
    }
  }

  const credentials = accounts.map((account) => {
    const password = suppliedPasswords[account.email];
    if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') < 20 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error(`A 20-72 byte initial password is required for ${account.email}.`);
    }
    return { ...account, password };
  });
  const created = [];
  const updated = [];

  await prisma.$transaction(async (tx) => {
    for (const account of credentials) {
      const password = await bcrypt.hash(account.password, 12);
      const data = { name: account.name, role: account.role, schoolId: school.id, password, emailVerified: true, isActive: true };
      const existingUser = existingByEmail.get(account.email);
      if (existingUser) {
        await tx.user.update({ where: { email: account.email }, data });
        await tx.refreshToken.updateMany({ where: { userId: existingUser.id, revokedAt: null }, data: { revokedAt: new Date() } });
        updated.push(account);
      } else {
        await tx.user.create({ data: { email: account.email, ...data } });
        created.push(account);
      }
    }
  });

  const includePasswords = process.env.NEXUS_STAFF_SILENT !== 'YES';
  const describe = (items) => items.map(({ email, name, role, password }) => ({
    email,
    name,
    role,
    ...(includePasswords ? { password } : {}),
  }));
  console.log(JSON.stringify({
    school: schoolSlug,
    created: describe(created),
    updated: describe(updated),
    note: 'These are Nexus login IDs; this command does not create mailboxes.',
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Staff account provisioning failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
