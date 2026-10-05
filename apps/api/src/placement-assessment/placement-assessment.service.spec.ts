import { PlacementAssessmentService } from './placement-assessment.service';
import { getPlacementAssessment } from './placement-assessment.data';

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

  it.each([
    [7, 'm1'],
    [8, 'm1'],
    [9, 'm1'],
    [10, 's1'],
    [11, 's1'],
    [12, 's1'],
  ])('selects the %s student assessment for key %s', async (gradeLevel, expectedKey) => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'student-1',
          role: 'STUDENT',
          schoolId: 'school-1',
          studentProfile: { gradeLevel },
        }),
      },
      placementAssessmentAttempt: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new PlacementAssessmentService(prisma as any, {} as any);

    const result = await service.getCurrentAssessment('student-1');

    expect(result.assessment.key).toBe(expectedKey);
    expect(result.assessment.questions.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toMatch(/correctAnswer|explanation/);
  });

  it.each([
    [7, 'm1'],
    [10, 's1'],
  ])('grades the %s placement test on the server for %s', async (gradeLevel, expectedKey) => {
    const assessment = getPlacementAssessment(expectedKey as 'm1' | 's1');
    const objectiveQuestions = assessment.questions.filter((question) =>
      (!question.responseType || question.responseType === 'choice') &&
      question.options.length > 1 && Boolean(question.correct) &&
      question.countsForScore !== false,
    );
    const answers = Object.fromEntries(objectiveQuestions.map((question) => [question.id, question.correct]));
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'student-1',
          role: 'STUDENT',
          schoolId: 'school-1',
          studentProfile: { gradeLevel },
        }),
      },
      placementAssessmentAttempt: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 'attempt-1',
          score: data.score,
          correctCount: data.correctCount,
          questionCount: data.questionCount,
          completedAt: new Date(),
        })),
      },
    };
    const service = new PlacementAssessmentService(prisma as any, {} as any);

    const result = await service.submit('student-1', answers);

    expect(result.score).toBe(100);
    expect(result.correctCount).toBe(objectiveQuestions.length);
    expect(prisma.placementAssessmentAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assessmentKey: expectedKey, gradeLevel, score: 100 }),
    }));
  });
});
