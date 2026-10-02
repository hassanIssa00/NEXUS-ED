import { StudentAnalyticsService } from './student-analytics.service';

describe('StudentAnalyticsService student progress', () => {
  const prisma = {
    grade: { findMany: jest.fn() },
    attendance: { findMany: jest.fn() },
    submission: { findMany: jest.fn() },
  };
  let service: StudentAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.grade.findMany.mockResolvedValue([]);
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.submission.findMany.mockResolvedValue([]);
    service = new StudentAnalyticsService(prisma as any);
  });

  it('returns no weekly points when the student has no source records', async () => {
    await expect(service.getStudentProgress('student-1')).resolves.toEqual([]);
  });

  it('returns nullable metrics for absent sources and calculates only recorded values', async () => {
    const date = new Date();
    prisma.attendance.findMany.mockResolvedValue([
      { date, status: 'PRESENT' },
    ]);

    await expect(service.getStudentProgress('student-1')).resolves.toEqual([
      expect.objectContaining({
        date: (service as any).getWeekStart(date),
        averageGrade: null,
        attendanceRate: 100,
        assignmentsCompleted: 0,
      }),
    ]);

    prisma.grade.findMany.mockResolvedValue([
      { createdAt: date, grade: 8, maxScore: 10 },
    ]);
    prisma.attendance.findMany.mockResolvedValue([
      { date, status: 'PRESENT' },
      { date, status: 'ABSENT' },
    ]);
    prisma.submission.findMany.mockResolvedValue([
      { submittedAt: date },
    ]);

    const result = await service.getStudentProgress('student-1');
    expect(result).toEqual([
      {
        date: (service as any).getWeekStart(date),
        averageGrade: 80,
        attendanceRate: 50,
        assignmentsCompleted: 1,
      },
    ]);
    expect(result[0]).not.toHaveProperty('overallScore');
  });
});
