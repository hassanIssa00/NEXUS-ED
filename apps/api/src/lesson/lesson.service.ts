import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { Prisma } from '@prisma/client';
import { Role } from '../auth/role.enum';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class LessonService {
  constructor(private prisma: PrismaService, @Optional() private uploadService?: UploadService) {}

  private async getActor(userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, schoolId: true, isActive: true },
    });
    if (!actor?.isActive || !actor.schoolId) throw new ForbiddenException('An active school account is required');
    return actor;
  }

  private async ownedFileReferences(
    values: string[] | undefined,
    actor: { id: string; role: string; schoolId: string | null },
  ) {
    if (!values?.length || !this.uploadService) return values ?? [];
    return Promise.all(values.map((value) => this.uploadService!.getOwnedFileReference(
      value,
      actor.id,
      actor.schoolId,
      actor.role === Role.ADMIN,
    )));
  }

  private async withSignedAttachments<T>(value: T): Promise<T> {
    if (!this.uploadService || value === null || value === undefined) return value;
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.withSignedAttachments(item))) as Promise<T>;
    }
    if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return value;

    const entries = await Promise.all(Object.entries(value as Record<string, unknown>).map(async ([key, item]) => {
      if (key === 'attachments' && Array.isArray(item)) {
        return [key, await this.uploadService!.getSignedUrlsForReferences(item.map(String))];
      }
      return [key, await this.withSignedAttachments(item)];
    }));
    return Object.fromEntries(entries) as T;
  }

  async create(data: CreateLessonDto, teacherId: string) {
    const actor = await this.getActor(teacherId);
    if (actor.role !== Role.TEACHER && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only school staff can create lessons');
    }
    // Verify teacher teaches this subject
    const subject = await this.prisma.subject.findUnique({
      where: { id: data.subjectId },
      include: { teacher: true },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (subject.schoolId !== actor.schoolId || (actor.role === Role.TEACHER && subject.teacherId !== teacherId)) {
      throw new ForbiddenException('You do not teach this subject');
    }

    const attachments = await this.ownedFileReferences(data.attachments, actor);
    const lesson = await this.prisma.lesson.create({
      data: {
        ...data,
        schoolId: actor.schoolId,
        attachments,
        authorId: teacherId,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    });
    return this.withSignedAttachments(lesson);
  }

  async findAll(filters: { subjectId?: string } = {}, actorId: string) {
    const actor = await this.getActor(actorId);
    const where: Prisma.LessonWhereInput = {
      OR: [
        { schoolId: actor.schoolId },
        { schoolId: null, subject: { schoolId: actor.schoolId } },
      ],
    };

    if (actor.role === Role.TEACHER) where.authorId = actor.id;
    if (actor.role === Role.STUDENT) {
      where.AND = {
        subject: {
          class: {
            schoolId: actor.schoolId,
            students: { some: { studentId: actor.id } },
          },
        },
      };
    }

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    const lessons = await this.prisma.lesson.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.withSignedAttachments(lessons);
  }

  async findByTeacher(teacherId: string) {
    const actor = await this.getActor(teacherId);
    if (actor.role !== Role.TEACHER) throw new ForbiddenException('Teacher account required');
    const lessons = await this.prisma.lesson.findMany({
      where: {
        authorId: teacherId,
        OR: [
          { schoolId: actor.schoolId },
          { schoolId: null, subject: { schoolId: actor.schoolId } },
        ],
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.withSignedAttachments(lessons);
  }

  async findOne(id: string, actorId: string) {
    const actor = await this.getActor(actorId);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            schoolId: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if ((lesson.schoolId ?? lesson.subject.schoolId) !== actor.schoolId) {
      throw new NotFoundException('Lesson not found');
    }
    if (actor.role === Role.STUDENT) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId: actor.id, classId: lesson.subject.classId },
        select: { id: true },
      });
      if (!enrollment) throw new NotFoundException('Lesson not found');
    } else if (actor.role === Role.TEACHER && lesson.authorId !== actor.id) {
      throw new NotFoundException('Lesson not found');
    }

    return this.withSignedAttachments(lesson);
  }

  async update(id: string, data: UpdateLessonDto, teacherId: string) {
    const actor = await this.getActor(teacherId);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { subject: { select: { schoolId: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const sameSchool = (lesson.schoolId ?? lesson.subject.schoolId) === actor.schoolId;
    const canManage = sameSchool && (
      actor.role === Role.ADMIN || (actor.role === Role.TEACHER && lesson.authorId === teacherId)
    );
    if (!canManage) {
      throw new ForbiddenException('You can only edit your own lessons');
    }

    const attachments = data.attachments === undefined
      ? undefined
      : await this.ownedFileReferences(data.attachments, actor);
    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: { ...data, ...(attachments === undefined ? {} : { attachments }) },
      include: {
        subject: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    });
    return this.withSignedAttachments(updatedLesson);
  }

  async delete(id: string, teacherId: string) {
    const actor = await this.getActor(teacherId);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { subject: { select: { schoolId: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const sameSchool = (lesson.schoolId ?? lesson.subject.schoolId) === actor.schoolId;
    const canManage = sameSchool && (
      actor.role === Role.ADMIN || (actor.role === Role.TEACHER && lesson.authorId === teacherId)
    );
    if (!canManage) {
      throw new ForbiddenException('You can only delete your own lessons');
    }

    return this.prisma.lesson.delete({
      where: { id },
    });
  }
}
