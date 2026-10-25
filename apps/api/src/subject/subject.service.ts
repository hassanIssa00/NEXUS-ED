import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  private requireSchool(schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    return schoolId;
  }

  private async assertClass(classId: string, schoolId: string) {
    const classroom = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });
    if (!classroom) throw new NotFoundException('Class not found in this school');
  }

  private async assertTeacher(teacherId: string, schoolId: string) {
    if (!teacherId) return;
    const teacher = await this.prisma.user.findFirst({
      where: { id: teacherId, schoolId, role: 'TEACHER', isActive: true },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found in this school');
  }

  private async resolveTeacherSchool(teacherId: string, schoolId?: string) {
    if (schoolId) return schoolId;
    const assignedClasses = await this.prisma.class.findMany({
      where: { OR: [{ teacherId }, { classSubjects: { some: { teacherId } } }] },
      select: { schoolId: true },
      take: 200,
    });
    const schoolIds = [...new Set(assignedClasses.map((item) => item.schoolId).filter((id): id is string => Boolean(id)))];
    if (schoolIds.length !== 1) throw new ForbiddenException('The teacher is not linked to one school');
    return schoolIds[0];
  }

  async create(data: CreateSubjectDto, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    await this.assertClass(data.classId, scopedSchoolId);
    await this.assertTeacher(data.teacherId, scopedSchoolId);
    return this.prisma.subject.create({ data: { ...data, schoolId: scopedSchoolId } });
  }

  async findAll(schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    return this.prisma.subject.findMany({
      where: { schoolId: scopedSchoolId },
      include: {
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { lessons: true, assignments: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findByStudent(studentId: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, class: { schoolId: scopedSchoolId } },
      include: {
        class: {
          include: {
            classSubjects: {
              include: {
                subject: {
                  include: {
                    teacher: { select: { id: true, name: true, email: true } },
                    _count: { select: { lessons: true, assignments: true } },
                  },
                },
              },
            },
            subjects: {
              include: {
                teacher: { select: { id: true, name: true, email: true } },
                _count: { select: { lessons: true, assignments: true } },
              },
            },
          },
        },
      },
    });

    const subjects = new Map<string, any>();
    for (const enrollment of enrollments) {
      const classroom = enrollment.class;
      const linkedSubjects = classroom.classSubjects?.length
        ? classroom.classSubjects.map((item) => item.subject)
        : classroom.subjects;
      for (const subject of linkedSubjects) {
        subjects.set(subject.id, { ...subject, className: classroom.name, classId: classroom.id });
      }
    }
    return Array.from(subjects.values());
  }

  async findByTeacher(teacherId: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(await this.resolveTeacherSchool(teacherId, schoolId));
    return this.prisma.subject.findMany({
      where: {
        schoolId: scopedSchoolId,
        OR: [
          { teacherId },
          { classSubjects: { some: { teacherId } } },
          // A homeroom teacher is responsible for the subjects in their class
          // even when the admin has not separately assigned each subject.
          { class: { teacherId } },
        ],
      },
      include: {
        class: { select: { id: true, name: true, teacherAssignments: { where: { teacherId }, select: { teacherId: true } } } },
        _count: { select: { lessons: true, assignments: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, actorId: string, role: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(role === 'TEACHER' ? await this.resolveTeacherSchool(actorId, schoolId) : schoolId);
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId: scopedSchoolId },
      include: {
        class: { select: { id: true, name: true, teacherId: true } },
        teacher: { select: { id: true, name: true, email: true } },
        classSubjects: { select: { teacherId: true } },
        lessons: true,
        assignments: true,
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    if (role === 'TEACHER') {
      const assigned = subject.teacherId === actorId || subject.class.teacherId === actorId || subject.classSubjects.some((item) => item.teacherId === actorId);
      if (!assigned) throw new ForbiddenException('You do not have access to this subject');
    } else if (role === 'STUDENT') {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId: actorId, classId: subject.classId, class: { schoolId: scopedSchoolId } },
        select: { id: true },
      });
      if (!enrollment) throw new ForbiddenException('You do not have access to this subject');
    }
    return subject;
  }

  async update(id: string, data: UpdateSubjectDto, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const subject = await this.prisma.subject.findFirst({ where: { id, schoolId: scopedSchoolId }, select: { id: true } });
    if (!subject) throw new NotFoundException('Subject not found');
    await this.assertClass(data.classId, scopedSchoolId);
    await this.assertTeacher(data.teacherId, scopedSchoolId);
    return this.prisma.subject.update({ where: { id }, data });
  }

  async remove(id: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const subject = await this.prisma.subject.findFirst({ where: { id, schoolId: scopedSchoolId }, select: { id: true } });
    if (!subject) throw new NotFoundException('Subject not found');
    return this.prisma.subject.delete({ where: { id } });
  }
}
