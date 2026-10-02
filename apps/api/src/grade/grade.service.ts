import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateGradeDto, UpdateGradeDto } from './dto/grade.dto';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class GradeService {
  constructor(
    private prisma: PrismaService,
    @Optional() private eventsGateway: EventsGateway,
  ) {}

  async create(data: CreateGradeDto, teacherId: string) {
    // Verify teacher teaches this subject
    const subject = await this.prisma.subject.findUnique({
      where: { id: data.subjectId },
      include: { teacher: true },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (subject.teacherId !== teacherId) {
      throw new ForbiddenException('You do not teach this subject');
    }

    const grade = await this.prisma.grade.create({
      data: {
        score: data.score,
        grade: data.score,
        maxScore: data.maxScore ?? 100,
        comments: data.comments,
        studentId: data.studentId,
        subjectId: data.subjectId,
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
    });

    // Emit real-time grade update to the student
    this.eventsGateway?.emitGradeUpdate(data.studentId, {
      subjectName: subject.name,
      score: grade.score,
      maxScore: grade.maxScore,
      comments: grade.comments,
      createdAt: new Date().toISOString(),
    });

    return grade;
  }


  async findAll(filters: { subjectId?: string; studentId?: string } = {}) {
    return this.prisma.grade.findMany({
      where: filters,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
  }

  async findMyGrades(studentId: string) {
    return this.prisma.grade.findMany({
      where: { studentId },
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
  }

  async findChildGradesForParent(parentId: string, studentId: string) {
    const relation = await this.prisma.parentStudent.findFirst({
      where: { parentId, studentId },
      include: {
        parent: { select: { schoolId: true } },
        student: { select: { schoolId: true, role: true, isActive: true } },
      },
    });
    if (
      !relation ||
      relation.student.role !== 'STUDENT' ||
      !relation.student.isActive ||
      !relation.parent.schoolId ||
      relation.parent.schoolId !== relation.student.schoolId
    ) {
      throw new ForbiddenException('You do not have access to this student');
    }

    return this.findMyGrades(studentId);
  }

  async findOne(id: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    return grade;
  }

  async update(id: string, data: UpdateGradeDto, teacherId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (grade.subject?.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You can only update grades for your subjects',
      );
    }

    return this.prisma.grade.update({
      where: { id },
      data: {
        score: data.score,
        grade: data.score,
        maxScore: data.maxScore,
        comments: data.comments,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async remove(id: string, teacherId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (grade.subject?.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You can only delete grades for your subjects',
      );
    }

    return this.prisma.grade.delete({
      where: { id },
    });
  }
}
