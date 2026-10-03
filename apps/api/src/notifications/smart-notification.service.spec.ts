import { PrismaService } from '../prisma.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { SmartNotificationService } from './smart-notification.service';

describe('SmartNotificationService', () => {
  const prisma = {
    assignment: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
  };
  let service: SmartNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SmartNotificationService(
      prisma as unknown as PrismaService,
      {} as EmailService,
      {} as WhatsAppService,
      undefined,
    );
  });

  it('finds overdue work from the classId/enrollment records and notifies only unsubmitted students', async () => {
    prisma.assignment.findMany.mockResolvedValue([
      {
        id: 'assignment-1',
        title: 'Math work',
        classId: 'class-1',
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        submissions: [{ studentId: 'student-1' }],
      },
      {
        id: 'assignment-2',
        title: 'Science work',
        classId: 'class-2',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        submissions: [],
      },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([
      { classId: 'class-1', studentId: 'student-1' },
      { classId: 'class-1', studentId: 'student-2' },
      { classId: 'class-2', studentId: 'student-3' },
    ]);
    const notifyLateAssignment = jest.spyOn(service, 'notifyLateAssignment').mockResolvedValue([
      { success: true },
    ]);

    await expect(service.checkLateAssignments()).resolves.toEqual({ processed: 2, notified: 2 });
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
      where: { classId: { in: ['class-1', 'class-2'] } },
      select: { classId: true, studentId: true },
    });
    expect(notifyLateAssignment.mock.calls).toEqual([
      ['student-2', 'Math work', 'assignment-1', expect.any(Number)],
      ['student-3', 'Science work', 'assignment-2', expect.any(Number)],
    ]);
  });
});
