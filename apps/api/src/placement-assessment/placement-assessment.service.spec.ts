import { PlacementAssessmentService } from './placement-assessment.service';

describe('PlacementAssessmentService', () => {
  const attempt = {
    id: 'attempt-1',
    studentId: 'student-1',
    gradeLevel: 7,
    assessmentKey: 'm1',
    correctCount: 1,
    questionCount: 2,
    score: 50,
    completedAt: new Date('2026-10-01T10:00:00Z'),
    answers: { question1: 'student choice' },
    questionSnapshot: [{ id: 'question1', correctAnswer: 'secret answer' }],
    student: { id: 'student-1', name: 'Student Name', firstName: null, lastName: null },
  };

  const createService = () => {
    const prisma = {
      user: { findUnique: jest.fn() },
      placementAssessmentAttempt: {
        findMany: jest.fn().mockResolvedValue([attempt]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const studentAnalytics = { assertCanAccessStudent: jest.fn() };
    const service = new PlacementAssessmentService(prisma as any, studentAnalytics as any);
    return { service, prisma, studentAnalytics };
  };

  it('returns report summaries without student answers or answer keys', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: 'teacher-1', schoolId: 'school-1' });

    const result = await service.listReports('teacher-1', 'TEACHER', 1, 25);

    expect(result.items).toEqual([{
      id: 'attempt-1',
      studentId: 'student-1',
      gradeLevel: 7,
      assessmentKey: 'm1',
      correctCount: 1,
      questionCount: 2,
      score: 50,
      completedAt: attempt.completedAt,
      studentName: 'Student Name',
    }]);
    expect(JSON.stringify(result)).not.toContain('secret answer');
    expect(prisma.placementAssessmentAttempt.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        schoolId: 'school-1',
        student: expect.objectContaining({
          enrollments: { some: { class: { OR: [{ teacherId: 'teacher-1' }, { classSubjects: { some: { teacherId: 'teacher-1' } } }] } } },
        }),
      }),
    }));
  });

  it('limits a parent report list to linked children', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: 'parent-1', schoolId: 'school-1' });

    await service.listReports('parent-1', 'PARENT', 1, 25);

    expect(prisma.placementAssessmentAttempt.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        schoolId: 'school-1',
        student: { schoolId: 'school-1', parents: { some: { parentId: 'parent-1' } } },
      }),
    }));
  });
});
