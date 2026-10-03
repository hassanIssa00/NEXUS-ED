import { PrismaService } from '../prisma.service';
import { EmailService } from '../notifications/email.service';
import { ScheduledReportService } from './scheduled-report.service';

describe('ScheduledReportService', () => {
  const prisma = {
    school: { findMany: jest.fn() },
    user: { findMany: jest.fn(), count: jest.fn() },
    attendance: { findMany: jest.fn(), count: jest.fn() },
    submission: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
    assignment: { count: jest.fn() },
  };
  const emailService = { sendEmail: jest.fn() };
  let service: ScheduledReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScheduledReportService(
      prisma as unknown as PrismaService,
      emailService as unknown as EmailService,
    );
  });

  it('counts only unsubmitted upcoming assignments in the student’s enrolled classes', async () => {
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.submission.findMany.mockResolvedValue([]);
    prisma.enrollment.findMany.mockResolvedValue([{ classId: 'student-class' }]);
    prisma.assignment.count.mockResolvedValue(2);

    const readStats = (service as unknown as {
      generateStudentStats: (studentId: string) => Promise<{
        attendance: { present: number; absent: number; late: number };
        grades: unknown[];
        pendingAssignments: number;
      }>;
    }).generateStudentStats;
    await expect(readStats.call(service, 'student-1')).resolves.toEqual({
      attendance: { present: 0, absent: 0, late: 0 },
      grades: [],
      pendingAssignments: 2,
    });

    expect(prisma.assignment.count).toHaveBeenCalledWith({
      where: {
        classId: { in: ['student-class'] },
        dueDate: { gte: expect.any(Date) },
        submissions: { none: { studentId: 'student-1' } },
      },
    });
  });

  it('limits executive report recipients and totals to each school', async () => {
    prisma.school.findMany.mockResolvedValue([{ id: 'school-1', name: 'School One' }]);
    prisma.user.findMany.mockResolvedValue([{ email: 'principal@example.invalid' }]);
    prisma.user.count.mockResolvedValueOnce(3).mockResolvedValueOnce(12);
    prisma.attendance.count.mockResolvedValue(8);
    emailService.sendEmail.mockResolvedValue(true);

    await service.handleDailyExecutiveReport();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        schoolId: 'school-1',
        role: { in: ['PRINCIPAL', 'VICE_PRINCIPAL'] },
        isActive: true,
      },
      select: { id: true, email: true, name: true, firstName: true },
    });
    expect(prisma.user.count.mock.calls).toEqual([
      [{ where: { schoolId: 'school-1', role: 'TEACHER', isActive: true } }],
      [{ where: { schoolId: 'school-1', role: 'STUDENT', isActive: true } }],
    ]);
    expect(prisma.attendance.count).toHaveBeenCalledWith({
      where: { date: { gte: expect.any(Date) }, class: { schoolId: 'school-1' } },
    });
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });
});
