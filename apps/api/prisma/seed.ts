import { PrismaClient, Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const schoolSlug = process.env.PUBLIC_SCHOOL_SLUG?.trim() || 'al-ikhlas-jeddah';
  const schoolName = process.env.NEXUS_SCHOOL_NAME?.trim() || 'مدارس الإخلاص الأهلية بجدة';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(schoolSlug)) {
    throw new Error('PUBLIC_SCHOOL_SLUG must be a lowercase URL-safe slug');
  }

  const school = await prisma.school.upsert({
    where: { slug: schoolSlug },
    update: {},
    create: { slug: schoolSlug, name: schoolName },
  });
  if (!school.isActive) {
    throw new Error('The configured school exists but is inactive; refusing to change its status during seeding');
  }

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error('Set both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to provision the initial administrator');
  }

  if (adminEmail && adminPassword) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address');
    }
    if (Buffer.byteLength(adminPassword, 'utf8') < 16 || Buffer.byteLength(adminPassword, 'utf8') > 72) {
      throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be 16-72 bytes');
    }

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      if (existing.role !== Role.ADMIN || existing.schoolId !== school.id) {
        throw new Error('BOOTSTRAP_ADMIN_EMAIL is already assigned to a non-administrator or another school');
      }
      console.info('Initial administrator already exists; leaving the account unchanged.');
    } else {
      const password = await bcrypt.hash(adminPassword, 12);
      await prisma.$transaction(async (transaction) => {
        const existingAdminCount = await transaction.user.count({
          where: { schoolId: school.id, role: Role.ADMIN, isActive: true },
        });
        if (existingAdminCount > 0) {
          throw new Error('An active administrator already exists; refusing to create another bootstrap account');
        }

        await transaction.user.create({
          data: {
            email: adminEmail,
            password,
            name: adminName || adminEmail,
            role: Role.ADMIN,
            schoolId: school.id,
            emailVerified: true,
            isActive: true,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      console.info('Initial administrator provisioned from environment; password was not logged.');
    }
  }

  console.info(`School base record is ready (${school.slug}). No synthetic student or class data was created.`);
}

main()
  .catch((error: unknown) => {
    console.error('Database bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
