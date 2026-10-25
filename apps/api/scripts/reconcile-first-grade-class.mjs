import { PrismaClient, Role } from '@prisma/client';

const schoolSlug = 'al-ikhlas-jeddah';
const displayClassName = 'أولى ابتدائي 1/2 - د. إسماعيل عيسى';
const prisma = new PrismaClient();

try {
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true },
  });
  if (!school) throw new Error('The target school was not found.');

  const classroom = await prisma.class.findFirst({
    where: {
      schoolId: school.id,
      OR: [
        { name: { contains: '1/2', mode: 'insensitive' } },
        { name: { contains: '١/٢', mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
  if (!classroom) throw new Error('The first-grade section 1/2 was not found; no roster changes were made.');

  if (classroom.name !== displayClassName) {
    await prisma.class.update({
      where: { id: classroom.id },
      data: {
        name: displayClassName,
        description: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
      },
    });
    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        action: 'class.section_renamed',
        entityType: 'class',
        entityId: classroom.id,
        metadata: { previousName: classroom.name, name: displayClassName },
      },
    });
  }

  const students = await prisma.user.findMany({
    where: { schoolId: school.id, role: Role.STUDENT, isActive: true },
    select: { id: true },
  });

  const added = students.length
    ? await prisma.enrollment.createMany({
        data: students.map(({ id }) => ({ studentId: id, classId: classroom.id })),
        skipDuplicates: true,
      })
    : { count: 0 };

  const [enrollmentCount, scheduleCount, subjectCount] = await Promise.all([
    prisma.enrollment.count({ where: { classId: classroom.id } }),
    prisma.scheduleEvent.count({ where: { classId: classroom.id } }),
    prisma.subject.count({ where: { classId: classroom.id } }),
  ]);

  if (added.count) {
    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        action: 'class.student_roster_reconciled',
        entityType: 'class',
        entityId: classroom.id,
        metadata: { addedEnrollments: added.count, activeStudents: students.length },
      },
    });
  }

  console.log(JSON.stringify({
    class: displayClassName,
    activeStudents: students.length,
    enrollmentsNow: enrollmentCount,
    newEnrollments: added.count,
    timetablePeriods: scheduleCount,
    subjects: subjectCount,
  }, null, 2));
} catch (error) {
  console.error('Class roster reconciliation failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
