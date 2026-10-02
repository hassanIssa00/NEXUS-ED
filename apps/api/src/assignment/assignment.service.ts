import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
} from './dto/assignment.dto';
import { EventsGateway } from '../gateway/events.gateway';
import { GamificationService } from '../gamification/gamification.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class AssignmentService {
  constructor(
    private prisma: PrismaService,
    @Optional() private eventsGateway: EventsGateway,
    @Optional() private gamification: GamificationService,
    @Optional() private uploadService?: UploadService,
  ) {}

  private async ownedFileReferences(
    values: string[] | undefined,
    actor: { id: string; role: string; schoolId: string | null },
  ): Promise<string[]> {
    if (!values?.length) return [];
    if (this.uploadService) {
      return Promise.all(values.map((value) => this.uploadService!.getOwnedFileReference(
        value,
        actor.id,
        actor.schoolId,
        actor.role === 'ADMIN',
      )));
    }

    const records = await this.prisma.file.findMany({
      where: {
        url: { in: values },
        ...(actor.role === 'ADMIN' && actor.schoolId
          ? { uploadedBy: { schoolId: actor.schoolId } }
          : { uploadedById: actor.id }),
      },
      select: { url: true },
    });
    if (new Set(records.map((record) => record.url)).size !== new Set(values).size) {
      throw new ForbiddenException('Every attachment must be uploaded by your account');
    }
    return values;
  }

  private async signAttachmentFields<T>(value: T): Promise<T> {
    if (!this.uploadService || value === null || value === undefined) return value;
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.signAttachmentFields(item))) as Promise<T>;
    }
    if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return value;

    const entries = await Promise.all(Object.entries(value as Record<string, unknown>).map(async ([key, item]) => {
      if (key === 'attachments' && Array.isArray(item)) {
        return [key, await this.uploadService!.getSignedUrlsForReferences(item.map(String))];
      }
      return [key, await this.signAttachmentFields(item)];
    }));
    return Object.fromEntries(entries) as T;
  }

  private async createAuditLog(params: {
    action: string;
    entityId?: string;
    userId?: string;
    schoolId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    if (!('auditLog' in this.prisma) || !this.prisma.auditLog) {
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: 'assignment',
        entityId: params.entityId,
        userId: params.userId,
        schoolId: params.schoolId ?? undefined,
        metadata: params.metadata,
      },
    });
  }

  private async getActiveActor(userId: string) {
    if (!userId) throw new ForbiddenException('An authenticated account is required');
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, schoolId: true, isActive: true },
    });
    if (!actor?.isActive || !actor.schoolId) {
      throw new ForbiddenException('An active school account is required');
    }
    return actor;
  }

  private assertAssignmentManager(
    actor: { id: string; role: string; schoolId: string | null },
    assignment: { teacherId: string; schoolId: string | null },
  ) {
    if (actor.schoolId !== assignment.schoolId) {
      throw new ForbiddenException('Assignment belongs to another school');
    }
    if (actor.role !== 'ADMIN' && (actor.role !== 'TEACHER' || actor.id !== assignment.teacherId)) {
      throw new ForbiddenException('You cannot manage this assignment');
    }
  }

  async create(data: CreateAssignmentDto, teacherId: string) {
    const actor = await this.getActiveActor(teacherId);
    if (actor.role !== 'TEACHER' && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only teachers and school administrators can create assignments');
    }
    const subject = await this.prisma.subject.findUnique({
      where: { id: data.subjectId },
      select: { id: true, name: true, code: true, teacherId: true, schoolId: true, classId: true },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (!subject.schoolId || subject.schoolId !== actor.schoolId) {
      throw new ForbiddenException('Subject belongs to another school');
    }
    if (actor.role === 'TEACHER' && subject.teacherId !== teacherId) {
      throw new ForbiddenException('You do not teach this subject');
    }
    const assignedTeacherId = actor.role === 'TEACHER' ? teacherId : subject.teacherId;
    if (!assignedTeacherId) throw new ForbiddenException('Assign a teacher to this subject first');
    const assignedTeacher = await this.prisma.user.findUnique({
      where: { id: assignedTeacherId },
      select: { id: true, role: true, schoolId: true, isActive: true },
    });
    if (!assignedTeacher?.isActive || assignedTeacher.role !== 'TEACHER' || assignedTeacher.schoolId !== actor.schoolId) {
      throw new ForbiddenException('The subject teacher is not an active teacher in this school');
    }
    const attachments = await this.ownedFileReferences(data.attachments, actor);

    const assignment = await this.prisma.assignment.create({
      data: {
        ...data,
        attachments,
        teacherId: assignedTeacherId,
        schoolId: subject.schoolId,
        classId: subject.classId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        maxScore: data.maxScore ?? 100,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    await this.createAuditLog({
      action: 'assignment.created',
      entityId: assignment.id,
      userId: actor.id,
      schoolId: subject.schoolId,
      metadata: {
        subjectId: subject.id,
        title: assignment.title,
      },
    });

    // Emit real-time event to all students in the class
    if (assignment && subject.classId) {
      this.eventsGateway?.emitNewAssignment(subject.classId, {
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject?.name,
        dueDate: assignment.dueDate,
        teacherName: assignment.teacher?.name,
        createdAt: new Date().toISOString(),
      });
    }

    return this.signAttachmentFields(assignment);
  }

  async findAll(filters: { subjectId?: string; teacherId?: string } = {}, actorId: string) {
    const actor = await this.getActiveActor(actorId);
    if (actor.role !== 'ADMIN' && actor.role !== 'TEACHER') {
      throw new ForbiddenException('Only school staff can view assignment lists');
    }
    const where: Prisma.AssignmentWhereInput = { schoolId: actor.schoolId };
    if (actor.role === 'TEACHER') where.teacherId = actor.id;
    else if (filters.teacherId) where.teacherId = filters.teacherId;

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    const assignments = await this.prisma.assignment.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.signAttachmentFields(assignments);
  }

  async findByTeacher(teacherId: string) {
    const actor = await this.getActiveActor(teacherId);
    if (actor.role !== 'TEACHER') throw new ForbiddenException('Teacher account required');
    const assignments = await this.prisma.assignment.findMany({
      where: { teacherId: actor.id, schoolId: actor.schoolId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.signAttachmentFields(assignments);
  }

  async findByStudent(studentId: string) {
    const actor = await this.getActiveActor(studentId);
    if (actor.role !== 'STUDENT') throw new ForbiddenException('Student account required');
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            classSubjects: {
              include: {
                subject: {
                  include: {
                    assignments: {
                      where: { schoolId: actor.schoolId },
                      include: {
                        subject: true,
                        submissions: {
                          where: { studentId },
                        },
                      },
                    },
                  },
                },
              },
            },
            subjects: {
              include: {
                assignments: {
                  where: { schoolId: actor.schoolId },
                  include: {
                    subject: true,
                    submissions: {
                      where: { studentId },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const assignments = enrollments.flatMap((enrollment) => {
      const enrollmentClass = enrollment.class as typeof enrollment.class & {
        subjects?: Array<{ assignments: any[] }>;
      };
      if (enrollment.class.schoolId !== actor.schoolId) return [];
      const classSubjects =
        enrollmentClass.classSubjects?.length > 0 
          ? enrollmentClass.classSubjects
          : (enrollmentClass.subjects?.map((subject) => ({ subject })) ?? []);

      return classSubjects.flatMap((classSubject) =>
        classSubject.subject.assignments.map((assignment) => ({
          ...assignment,
          classId: enrollment.classId,
          submission: assignment.submissions[0] || null,
          status: assignment.submissions[0]?.gradedAt
            ? 'graded'
            : assignment.submissions[0]
              ? 'submitted'
              : 'pending',
          grade: assignment.submissions[0]?.grade ?? assignment.submissions[0]?.score ?? null,
        })),
      );
    });

    const dedupedAssignments = new Map<string, (typeof assignments)[number]>();
    assignments.forEach((assignment) => {
      dedupedAssignments.set(assignment.id, assignment);
    });

    const result = Array.from(dedupedAssignments.values()).sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
    return this.signAttachmentFields(result);
  }

  async findOne(id: string, actorId: string) {
    const actor = await this.getActiveActor(actorId);
    if (actor.role === 'STUDENT') {
      const allowed = await this.findByStudent(actor.id);
      const studentAssignment = allowed.find((item) => item.id === id);
      if (!studentAssignment) throw new NotFoundException('Assignment not found');
      return this.signAttachmentFields(studentAssignment);
    }
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    this.assertAssignmentManager(actor, assignment);

    return this.signAttachmentFields(assignment);
  }

  async update(id: string, data: UpdateAssignmentDto, actorId: string) {
    const actor = await this.getActiveActor(actorId);
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    this.assertAssignmentManager(actor, assignment);

    const attachments = data.attachments === undefined
      ? undefined
      : await this.ownedFileReferences(data.attachments, actor);

    const updatedAssignment = await this.prisma.assignment.update({
      where: { id },
      data: {
        ...data,
        ...(attachments === undefined ? {} : { attachments }),
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate,
      },
      include: {
        subject: true,
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.createAuditLog({
      action: 'assignment.updated',
      entityId: updatedAssignment.id,
      userId: actor.id,
      schoolId: updatedAssignment.schoolId,
      metadata: {
        title: updatedAssignment.title,
      },
    });

    return this.signAttachmentFields(updatedAssignment);
  }

  async delete(id: string, actorId: string) {
    const actor = await this.getActiveActor(actorId);
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    this.assertAssignmentManager(actor, assignment);

    const deletedAssignment = await this.prisma.assignment.delete({
      where: { id },
    });

    await this.createAuditLog({
      action: 'assignment.deleted',
      entityId: deletedAssignment.id,
      userId: actor.id,
      schoolId: deletedAssignment.schoolId,
      metadata: {
        title: deletedAssignment.title,
      },
    });

    return deletedAssignment;
  }

  async submit(
    assignmentId: string,
    data: SubmitAssignmentDto,
    studentId: string,
  ) {
    const actor = await this.getActiveActor(studentId);
    if (actor.role !== 'STUDENT') throw new ForbiddenException('Student account required');
    if (!data.content?.trim() && !(data.attachments?.length)) {
      throw new BadRequestException('Write an answer or attach a file before submitting');
    }
    const assignment = (await this.findByStudent(studentId)).find((item) => item.id === assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    const attachments = await this.ownedFileReferences(data.attachments, actor);

    // Check if already submitted
    const existing = await this.prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
    });

    if (existing) {
      if (existing.gradedAt) {
        throw new ForbiddenException('A graded submission cannot be replaced');
      }
      // Update existing submission
      return this.prisma.submission.update({
        where: { id: existing.id },
        data: {
          content: data.content?.trim() || null,
          attachments,
          submittedAt: new Date(),
          grade: null,
          score: null,
          feedback: null,
          gradedAt: null,
        },
      }).then(async (submission) => {
        const assignmentWithSchool = await this.prisma.assignment.findUnique({
          where: { id: assignmentId },
          select: { schoolId: true, title: true },
        });

        await this.createAuditLog({
          action: 'assignment.resubmitted',
          entityId: assignmentId,
          userId: studentId,
          schoolId: assignmentWithSchool?.schoolId,
          metadata: {
            submissionId: submission.id,
            title: assignmentWithSchool?.title,
          },
        });

        return this.signAttachmentFields(submission);
      });
    }

    const submission = await this.prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        content: data.content?.trim() || null,
        attachments,
      },
    });

    await this.createAuditLog({
      action: 'assignment.submitted',
      entityId: assignmentId,
      userId: studentId,
      schoolId: assignment.schoolId,
      metadata: {
        submissionId: submission.id,
        title: assignment.title,
      },
    });

    // Gamification: Reward XP for submission
    if (this.gamification) {
      let xpAward = 20;
      let reason = 'تسليم الواجب';
      if (assignment.dueDate && new Date() <= new Date(assignment.dueDate)) {
        xpAward += 30; // Bonus for on-time submission
        reason = 'تسليم الواجب في الوقت المحدد';
      }
      await this.gamification.awardXp(studentId, xpAward, reason, submission.id);
    }

    return this.signAttachmentFields(submission);
  }

  async getSubmissions(assignmentId: string, teacherId: string) {
    const actor = await this.getActiveActor(teacherId);
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    this.assertAssignmentManager(actor, assignment);

    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
    return this.signAttachmentFields(submissions);
  }

  async getTeacherSubmissions(teacherId: string) {
    const actor = await this.getActiveActor(teacherId);
    if (actor.role !== 'TEACHER') throw new ForbiddenException('Teacher account required');
    const submissions = await this.prisma.submission.findMany({
      where: { assignment: { teacherId: actor.id, schoolId: actor.schoolId } },
      include: {
        student: { select: { id: true, name: true, email: true } },
        assignment: { select: { id: true, title: true, maxScore: true, subjectId: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    return this.signAttachmentFields(submissions);
  }

  async gradeSubmission(
    submissionId: string,
    data: GradeSubmissionDto,
    teacherId: string,
  ) {
    const actor = await this.getActiveActor(teacherId);
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    this.assertAssignmentManager(actor, submission.assignment);
    if (!Number.isFinite(data.score) || data.score < 0 || data.score > submission.assignment.maxScore) {
      throw new BadRequestException(`Score must be between 0 and ${submission.assignment.maxScore}`);
    }

    const gradedAt = new Date();
    const [gradedSubmission] = await this.prisma.$transaction([
      this.prisma.submission.update({
        where: { id: submissionId },
        data: { grade: data.score, score: data.score, feedback: data.feedback, gradedAt },
        include: { student: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.grade.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId: submission.assignmentId,
            studentId: submission.studentId,
          },
        },
        update: {
          score: data.score,
          grade: data.score,
          maxScore: submission.assignment.maxScore,
          comments: data.feedback,
          subjectId: submission.assignment.subjectId,
        },
        create: {
          assignmentId: submission.assignmentId,
          score: data.score,
          grade: data.score,
          maxScore: submission.assignment.maxScore,
          comments: data.feedback,
          studentId: submission.studentId,
          subjectId: submission.assignment.subjectId,
        },
      }),
    ]);

    await this.createAuditLog({
      action: 'assignment.graded',
      entityId: submission.assignmentId,
      userId: actor.id,
      schoolId: submission.assignment.schoolId,
      metadata: {
        submissionId,
        studentId: gradedSubmission.student.id,
        score: data.score,
      },
    });

    if (this.gamification) {
      let gradeXp = 10;
      if (data.score >= 90) gradeXp = 50;
      else if (data.score >= 75) gradeXp = 30;
      
      await this.gamification.awardXp(
        gradedSubmission.student.id,
        gradeXp,
        `الحصول على درجة ${data.score}% في الواجب`,
        submission.id
      );
    }

    return gradedSubmission;
  }
}
