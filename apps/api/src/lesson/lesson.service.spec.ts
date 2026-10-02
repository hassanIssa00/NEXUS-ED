import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Role } from '../auth/role.enum';
import { UploadService } from '../upload/upload.service';
import { LessonService } from './lesson.service';

describe('LessonService access control', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    lesson: { findUnique: jest.fn(), findMany: jest.fn() },
    enrollment: { findFirst: jest.fn() },
  };
  const uploadService = {
    getSignedUrlsForReferences: jest.fn(),
    getOwnedFileReference: jest.fn(),
  };
  const service = new LessonService(
    prisma as unknown as PrismaService,
    uploadService as unknown as UploadService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1', role: Role.STUDENT, schoolId: 'school-1', isActive: true,
    });
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lesson-1',
      schoolId: 'school-1',
      authorId: 'teacher-1',
      attachments: ['file:file-1'],
      subject: {
        id: 'subject-1', schoolId: 'school-1', classId: 'class-1',
        class: { id: 'class-1', name: 'Class 1' },
      },
      author: { id: 'teacher-1', name: 'Teacher' },
    });
    uploadService.getSignedUrlsForReferences.mockImplementation((values: string[]) =>
      Promise.resolve(values.map(() => 'https://storage.test/signed-file')),
    );
  });

  it('limits student lesson lists to enrolled classes in their school', async () => {
    prisma.lesson.findMany.mockResolvedValue([]);

    await service.findAll({}, 'student-1');

    expect(prisma.lesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { schoolId: 'school-1' },
          { schoolId: null, subject: { schoolId: 'school-1' } },
        ],
        AND: {
          subject: {
            class: {
              schoolId: 'school-1',
              students: { some: { studentId: 'student-1' } },
            },
          },
        },
      },
    }));
  });

  it('signs lesson files only after confirming the student enrollment', async () => {
    prisma.enrollment.findFirst.mockResolvedValue({ id: 'enrollment-1' });

    await expect(service.findOne('lesson-1', 'student-1')).resolves.toMatchObject({
      attachments: ['https://storage.test/signed-file'],
    });
    expect(prisma.enrollment.findFirst).toHaveBeenCalledWith({
      where: { studentId: 'student-1', classId: 'class-1' },
      select: { id: true },
    });
    expect(uploadService.getSignedUrlsForReferences).toHaveBeenCalledWith(['file:file-1']);
  });

  it('does not sign files for students outside the lesson class', async () => {
    prisma.enrollment.findFirst.mockResolvedValue(null);

    await expect(service.findOne('lesson-1', 'student-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(uploadService.getSignedUrlsForReferences).not.toHaveBeenCalled();
  });

  it('requires an active school account before returning lessons', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1', role: Role.STUDENT, schoolId: 'school-1', isActive: false,
    });

    await expect(service.findOne('lesson-1', 'student-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
  });
});
