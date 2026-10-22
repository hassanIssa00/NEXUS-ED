import { NotFoundException } from '@nestjs/common';
import { Role } from '../../auth/role.enum';
import { AiTutorController } from './ai-tutor.controller';

describe('AiTutorController teacher tools', () => {
  const createController = (overrides: Record<string, any> = {}) => {
    const aiExamService = { generateExam: jest.fn() };
    const aiContentService = { processContent: jest.fn() };
    const prisma = {
      user: { findUnique: jest.fn() },
      subject: { findFirst: jest.fn() },
      lesson: { findFirst: jest.fn() },
    };
    Object.assign(aiExamService, overrides.aiExamService);
    Object.assign(aiContentService, overrides.aiContentService);
    Object.assign(prisma.user, overrides.user);
    Object.assign(prisma.subject, overrides.subject);
    Object.assign(prisma.lesson, overrides.lesson);

    const controller = new AiTutorController(
      { askTutor: jest.fn() } as any,
      aiExamService as any,
      {} as any,
      {} as any,
      {} as any,
      aiContentService as any,
      {} as any,
      {} as any,
      prisma as any,
      { build: jest.fn() } as any,
    );
    return { controller, aiExamService, aiContentService, prisma };
  };

  it('generates questions only for a subject assigned to the authenticated teacher', async () => {
    const question = {
      question: 'ما ناتج ٢ + ٢؟',
      type: 'multiple_choice',
      options: ['٤', '٥'],
      correctAnswer: '٤',
    };
    const { controller, aiExamService, prisma } = createController({
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ schoolId: 'school-1', isActive: true }),
      },
      subject: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            name: 'الرياضيات',
            class: { name: 'الصف الأول' },
          }),
      },
      aiExamService: { generateExam: jest.fn().mockResolvedValue([question]) },
    });

    await expect(
      controller.suggestQuestions(
        {
          subjectId: 'subject-1',
          topic: 'الجمع',
          count: 1,
          difficulty: 'MEDIUM',
        },
        { user: { userId: 'teacher-1', role: Role.TEACHER } },
      ),
    ).resolves.toEqual({ success: true, data: { questions: [question] } });

    expect(prisma.subject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'subject-1',
          schoolId: 'school-1',
          OR: [
            { teacherId: 'teacher-1' },
            { classSubjects: { some: { teacherId: 'teacher-1' } } },
          ],
        }),
      }),
    );
    expect(aiExamService.generateExam).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'الرياضيات',
        gradeLevel: 'الصف الأول',
        questionCount: 1,
        difficulty: 'MEDIUM',
      }),
    );
  });

  it('summarizes only the authenticated teacher own lesson and returns the UI contract', async () => {
    const { controller, aiContentService, prisma } = createController({
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            role: Role.TEACHER,
            schoolId: 'school-1',
            isActive: true,
          }),
      },
      lesson: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 'lesson-1',
            title: 'الجمع',
            content: 'محتوى الدرس',
          }),
      },
      aiContentService: {
        processContent: jest.fn().mockResolvedValue({
          summary: 'ملخص',
          keyConcepts: ['الجمع'],
          quiz: [
            {
              question: 'سؤال',
              options: ['أ', 'ب'],
              correctAnswer: 1,
              explanation: 'شرح',
            },
          ],
          flashcards: [],
          homework: [],
        }),
      },
    });

    await expect(
      controller.summarizeLesson('lesson-1', {
        user: { userId: 'teacher-1', role: Role.TEACHER },
      }),
    ).resolves.toEqual({
      success: true,
      data: {
        title: 'الجمع',
        keyPoints: ['ملخص'],
        concepts: ['الجمع'],
        practiceQuestions: [
          {
            question: 'سؤال',
            options: ['أ', 'ب'],
            correctAnswer: 1,
            explanation: 'شرح',
          },
        ],
      },
    });
    expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'lesson-1',
        AND: [
          {
            OR: [
              { schoolId: 'school-1' },
              { schoolId: null, subject: { schoolId: 'school-1' } },
            ],
          },
          { authorId: 'teacher-1' },
        ],
      },
      select: { id: true, title: true, content: true },
    });
    expect(aiContentService.processContent).toHaveBeenCalledWith('محتوى الدرس');
  });

  it('does not summarize a lesson that is not owned by the teacher', async () => {
    const { controller, aiContentService } = createController({
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            role: Role.TEACHER,
            schoolId: 'school-1',
            isActive: true,
          }),
      },
      lesson: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      controller.summarizeLesson('another-teachers-lesson', {
        user: { userId: 'teacher-1', role: Role.TEACHER },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(aiContentService.processContent).not.toHaveBeenCalled();
  });

  it('lets a student summarize only lessons for an enrolled class and hides answer keys', async () => {
    const { controller, aiContentService, prisma } = createController({
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            role: Role.STUDENT,
            schoolId: 'school-1',
            isActive: true,
          }),
      },
      lesson: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 'lesson-1',
            title: 'الجمع',
            content: 'محتوى الدرس',
          }),
      },
      aiContentService: {
        processContent: jest.fn().mockResolvedValue({
          summary: 'ملخص',
          keyConcepts: ['الجمع'],
          quiz: [
            {
              question: 'سؤال',
              options: ['أ', 'ب'],
              correctAnswer: 1,
              explanation: 'الإجابة ب',
            },
          ],
          flashcards: [],
          homework: [],
        }),
      },
    });

    const result = await controller.summarizeLesson('lesson-1', {
      user: { userId: 'student-1', role: Role.STUDENT },
    });
    expect(result).toEqual({
      success: true,
      data: {
        title: 'الجمع',
        keyPoints: ['ملخص'],
        concepts: ['الجمع'],
        practiceQuestions: [{ question: 'سؤال', options: ['أ', 'ب'] }],
      },
    });

    expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'lesson-1',
        AND: [
          {
            OR: [
              { schoolId: 'school-1' },
              { schoolId: null, subject: { schoolId: 'school-1' } },
            ],
          },
          {
            subject: {
              class: {
                schoolId: 'school-1',
                students: { some: { studentId: 'student-1' } },
              },
            },
          },
        ],
      },
      select: { id: true, title: true, content: true },
    });
    expect(JSON.stringify(result)).not.toContain('correctAnswer');
  });

  it('rejects lesson summaries for inactive or mismatched accounts', async () => {
    const { controller, aiContentService } = createController({
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            role: Role.TEACHER,
            schoolId: 'school-1',
            isActive: false,
          }),
      },
    });

    await expect(
      controller.summarizeLesson('lesson-1', {
        user: { userId: 'teacher-1', role: Role.TEACHER },
      }),
    ).rejects.toThrow('حسابك غير نشط أو غير مرتبط بمدرسة');
    expect(aiContentService.processContent).not.toHaveBeenCalled();
  });
});
