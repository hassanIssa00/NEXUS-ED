import { PrismaService } from '../../core/database/prisma.service';
import { TeacherWorkspaceService } from './teacher-workspace.service';

describe('TeacherWorkspaceService quizzes', () => {
  const actor = { userId: 'student-1', schoolId: 'school-1', role: 'STUDENT' };

  function createService() {
    const quiz = {
      id: 'quiz-1',
      schoolId: 'school-1',
      classId: 'class-1',
      published: true,
      title: 'Sample assessment',
      instructions: null,
      dueAt: null,
      showResults: false,
      questions: [
        {
          id: 'q1',
          prompt: 'Choose the right option',
          type: 'multiple_choice',
          points: 2,
          options: [{ text: 'Correct', correct: true }, { text: 'Wrong', correct: false }],
        },
        { id: 'q2', prompt: 'Explain your answer', type: 'essay', points: 3 },
      ],
    };
    const prisma = {
      teacherQuiz: { findFirst: jest.fn().mockResolvedValue(quiz) },
      enrollment: { findFirst: jest.fn().mockResolvedValue({ id: 'enrollment-1' }) },
      quizAttempt: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => data),
      },
    };
    return {
      service: new TeacherWorkspaceService(prisma as unknown as PrismaService, {} as any),
      prisma,
    };
  }

  it('hides answer keys from the student quiz payload', async () => {
    const { service } = createService();

    const quiz = await service.getStudentQuiz(actor, 'quiz-1');

    expect(quiz.questions).toEqual([
      { id: 'q1', prompt: 'Choose the right option', type: 'multiple_choice', points: 2, options: ['Correct', 'Wrong'] },
      { id: 'q2', prompt: 'Explain your answer', type: 'essay', points: 3, options: undefined },
    ]);
    expect(JSON.stringify(quiz)).not.toContain('correctAnswer');
    expect(JSON.stringify(quiz)).not.toContain('"correct"');
  });

  it('keeps essay-containing attempts pending manual grading', async () => {
    const { service, prisma } = createService();

    await service.submitQuiz(actor, 'quiz-1', { answers: { q1: '0', q2: 'Because it is correct' } });

    expect(prisma.quizAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        answers: { q1: '0', q2: 'Because it is correct' },
        score: null,
        maxScore: 5,
      }),
    }));
  });
});

describe('TeacherWorkspaceService parent meeting bookings', () => {
  it('reactivates a cancelled booking instead of violating the unique booking key', async () => {
    const booking = { id: 'booking-1', meetingId: 'meeting-1', status: 'BOOKED', createdAt: new Date() };
    const tx = {
      parentMeeting: { findFirst: jest.fn().mockResolvedValue({ id: 'meeting-1', classId: 'class-1', maxBookings: 1, startsAt: new Date(Date.now() + 60_000) }) },
      enrollment: { findFirst: jest.fn().mockResolvedValue({ id: 'enrollment-1' }) },
      parentMeetingBooking: {
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn().mockResolvedValue(booking),
      },
    };
    const prisma = {
      parentStudent: { findUnique: jest.fn().mockResolvedValue({ id: 'parent-link-1' }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'student-1' }) },
      $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    };
    const actor = { userId: 'parent-1', schoolId: 'school-1', role: 'PARENT' };
    const service = new TeacherWorkspaceService(prisma as unknown as PrismaService, {} as any);

    await service.bookMeeting(actor, 'meeting-1', { studentId: 'student-1', note: 'Please call me' });

    expect(tx.parentMeetingBooking.count).toHaveBeenCalledWith({ where: { meetingId: 'meeting-1', status: 'BOOKED' } });
    expect(tx.parentMeetingBooking.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { meetingId_parentId_studentId: { meetingId: 'meeting-1', parentId: 'parent-1', studentId: 'student-1' } },
      update: { status: 'BOOKED', note: 'Please call me' },
    }));
  });
});
