import { TestingModule, Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { PrismaService } from '../prisma.service';

describe('AssignmentService', () => {
  let service: AssignmentService;

  const prisma = {
    user: {
      findUnique: jest.fn(({ where }) => Promise.resolve({
        id: where.id,
        role: where.id === 'student-1' ? 'STUDENT' : 'TEACHER',
        schoolId: 'school-1',
        isActive: true,
      })),
    },
    file: { findMany: jest.fn().mockResolvedValue([]) },
    subject: { findUnique: jest.fn() },
    assignment: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
    enrollment: { findMany: jest.fn() },
    submission: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    grade: { upsert: jest.fn() },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssignmentService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AssignmentService);
    jest.clearAllMocks();
    prisma.user.findUnique.mockImplementation(({ where }) => Promise.resolve({
      id: where.id,
      role: where.id === 'student-1' ? 'STUDENT' : 'TEACHER',
      schoolId: 'school-1',
      isActive: true,
    }));
    prisma.file.findMany.mockResolvedValue([]);
  });

  it('creates a teacher assignment only for their active school subject', async () => {
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1', name: 'Math', code: 'M', teacherId: 'teacher-1', schoolId: 'school-1', classId: 'class-1',
    });
    prisma.assignment.create.mockResolvedValue({ id: 'assignment-1', title: 'Quiz' });

    await expect(service.create({ title: 'Quiz', subjectId: 'subject-1' }, 'teacher-1'))
      .resolves.toMatchObject({ id: 'assignment-1' });
    expect(prisma.assignment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ teacherId: 'teacher-1', schoolId: 'school-1', classId: 'class-1', maxScore: 100 }),
    }));
  });

  it('rejects a teacher who does not own the subject', async () => {
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1', teacherId: 'teacher-2', schoolId: 'school-1' });
    await expect(service.create({ title: 'Quiz', subjectId: 'subject-1' }, 'teacher-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('limits teacher assignment lists to their own school and assignments', async () => {
    prisma.assignment.findMany.mockResolvedValue([{ id: 'assignment-1' }]);
    await service.findAll({}, 'teacher-1');
    expect(prisma.assignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { schoolId: 'school-1', teacherId: 'teacher-1' },
    }));
  });

  it('does not expose enrolled classes from another school to students', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT', schoolId: 'school-1', isActive: true });
    prisma.enrollment.findMany.mockResolvedValue([{
      class: { schoolId: 'school-2', subjects: [{ assignments: [{ id: 'foreign', submissions: [] }] }] },
    }]);
    await expect(service.findByStudent('student-1')).resolves.toEqual([]);
  });

  it('refuses submissions when the student is not enrolled in the assignment class', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT', schoolId: 'school-1', isActive: true });
    prisma.enrollment.findMany.mockResolvedValue([]);
    await expect(service.submit('assignment-1', { content: 'Answer' }, 'student-1'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.submission.create).not.toHaveBeenCalled();
  });

  it('rejects empty assignment submissions', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT', schoolId: 'school-1', isActive: true });
    await expect(service.submit('assignment-1', { content: '  ' }, 'student-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists a teacher grade and report grade atomically', async () => {
    prisma.submission.findUnique.mockResolvedValue({
      id: 'submission-1', studentId: 'student-1', assignmentId: 'assignment-1',
      assignment: { id: 'assignment-1', teacherId: 'teacher-1', schoolId: 'school-1', subjectId: 'subject-1', maxScore: 20 },
    });
    prisma.submission.update.mockResolvedValue({
      id: 'submission-1', student: { id: 'student-1', name: 'Student', email: 'student@example.test' },
    });
    prisma.grade.upsert.mockResolvedValue({ id: 'grade-1' });

    await service.gradeSubmission('submission-1', { score: 16, feedback: 'راجع الخطوة الثانية' }, 'teacher-1');

    expect(prisma.grade.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { assignmentId_studentId: { assignmentId: 'assignment-1', studentId: 'student-1' } },
      create: expect.objectContaining({ assignmentId: 'assignment-1', studentId: 'student-1', subjectId: 'subject-1', score: 16, maxScore: 20 }),
    }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects out-of-range scores and blocks cross-teacher grading', async () => {
    prisma.submission.findUnique.mockResolvedValue({
      id: 'submission-1', studentId: 'student-1', assignmentId: 'assignment-1',
      assignment: { id: 'assignment-1', teacherId: 'teacher-2', schoolId: 'school-1', subjectId: 'subject-1', maxScore: 20 },
    });
    await expect(service.gradeSubmission('submission-1', { score: 21 }, 'teacher-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.submission.findUnique.mockResolvedValue({
      id: 'submission-1', studentId: 'student-1', assignmentId: 'assignment-1',
      assignment: { id: 'assignment-1', teacherId: 'teacher-1', schoolId: 'school-1', subjectId: 'subject-1', maxScore: 20 },
    });
    await expect(service.gradeSubmission('submission-1', { score: 21 }, 'teacher-1'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
