import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AssignmentTemplateService } from './assignment-template.service';

describe('AssignmentTemplateService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    class: { findFirst: jest.fn() },
    assignment: { create: jest.fn() },
  };
  let service: AssignmentTemplateService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssignmentTemplateService(prisma as unknown as PrismaService);
  });

  it('creates an assignment using the teacher-owned class subject and school scope', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'teacher-1', role: 'TEACHER', schoolId: 'school-1', isActive: true,
    });
    prisma.class.findFirst.mockResolvedValue({
      id: 'class-1', subjects: [{ id: 'subject-1' }],
    });
    prisma.assignment.create.mockResolvedValue({ id: 'assignment-1' });

    await expect(service.createFromTemplate('template-math-quiz', 'teacher-1', 'class-1', {
      dueDate: '2026-10-15T12:00:00.000Z',
      points: 20,
    })).resolves.toEqual({ id: 'assignment-1' });

    expect(prisma.assignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        classId: 'class-1',
        schoolId: 'school-1',
        subjectId: 'subject-1',
        teacherId: 'teacher-1',
        maxScore: 20,
        dueDate: new Date('2026-10-15T12:00:00.000Z'),
      }),
    });
  });

  it('does not create assignments for a class without a teacher-owned subject', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'teacher-1', role: 'TEACHER', schoolId: 'school-1', isActive: true,
    });
    prisma.class.findFirst.mockResolvedValue({ id: 'class-1', subjects: [] });

    await expect(service.createFromTemplate('template-math-quiz', 'teacher-1', 'class-1', {}))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.assignment.create).not.toHaveBeenCalled();
  });

  it('rejects unknown template IDs', () => {
    expect(() => service.getTemplateById('missing-template')).toThrow(NotFoundException);
  });
});
