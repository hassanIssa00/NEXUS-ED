import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEnrollmentDto } from './dto/enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  private requireSchool(schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    return schoolId;
  }

  private async assertClassAccess(classId: string, actorId: string, role: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const classroom = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: scopedSchoolId },
      select: { id: true, name: true, academicYear: true, teacherId: true, classSubjects: { select: { teacherId: true } } },
    });
    if (!classroom) throw new NotFoundException('Class not found');

    const isAssignedTeacher = role === 'TEACHER' && (
      classroom.teacherId === actorId || classroom.classSubjects.some((subject) => subject.teacherId === actorId)
    );
    if (role !== 'ADMIN' && !isAssignedTeacher) {
      throw new ForbiddenException('You do not have access to this class');
    }
    return classroom;
  }

  async create(data: CreateEnrollmentDto, actorId: string, role: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const classroom = await this.assertClassAccess(data.classId, actorId, role, scopedSchoolId);
    const student = await this.prisma.user.findFirst({
      where: { id: data.studentId, schoolId: scopedSchoolId, role: 'STUDENT', isActive: true },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student not found in this school');

    const existing = await this.prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId: data.studentId, classId: data.classId } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Student is already enrolled in this class');

    return this.prisma.enrollment.create({
      data,
      include: {
        student: { select: { id: true, email: true, firstName: true, lastName: true, name: true } },
        class: { select: { id: true, name: true, academicYear: true } },
      },
    });
  }

  async findByClass(classId: string, actorId: string, role: string, schoolId?: string) {
    await this.assertClassAccess(classId, actorId, role, schoolId);
    return this.prisma.enrollment.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, email: true, firstName: true, lastName: true, name: true, phone: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async findByStudent(studentId: string, actorId: string, role: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId: scopedSchoolId, role: 'STUDENT' },
      select: {
        id: true,
        parents: { select: { parentId: true } },
        enrollments: { select: { classId: true, class: { select: { teacherId: true, classSubjects: { select: { teacherId: true } } } } } },
      },
    });
    if (!student) throw new NotFoundException('Student not found in this school');

    const allowed = role === 'ADMIN'
      || (role === 'PARENT' && student.parents.some((parent) => parent.parentId === actorId))
      || (role === 'TEACHER' && student.enrollments.some(({ class: classroom }) =>
        classroom.teacherId === actorId || classroom.classSubjects.some((subject) => subject.teacherId === actorId),
      ));
    if (!allowed) throw new ForbiddenException('You do not have access to this student');

    return this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true,
            academicYear: true,
            teacher: { select: { id: true, firstName: true, lastName: true, name: true, email: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async delete(id: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, class: { schoolId: scopedSchoolId } },
      select: { id: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return this.prisma.enrollment.delete({ where: { id } });
  }

  async findCandidates(classId: string, schoolId: string | undefined, pageValue?: string, limitValue?: string, searchValue?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const classroom = await this.prisma.class.findFirst({ where: { id: classId, schoolId: scopedSchoolId }, select: { id: true } });
    if (!classroom) throw new NotFoundException('Class not found in this school');

    const page = Math.max(1, Number(pageValue) || 1);
    const limit = Math.min(100, Math.max(1, Number(limitValue) || 25));
    const where: any = {
      schoolId: scopedSchoolId,
      role: 'STUDENT',
      isActive: true,
      enrollments: { none: { classId } },
    };
    const search = searchValue?.trim();
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, name: true, firstName: true, lastName: true, email: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: students, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async bulkEnroll(studentIds: string[], classId: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    if (!studentIds?.length || studentIds.length > 100) {
      throw new BadRequestException('Select between 1 and 100 students');
    }
    const classroom = await this.prisma.class.findFirst({ where: { id: classId, schoolId: scopedSchoolId }, select: { id: true } });
    if (!classroom) throw new NotFoundException('Class not found in this school');

    const uniqueIds = [...new Set(studentIds)];
    if (uniqueIds.length !== studentIds.length) throw new BadRequestException('Student IDs must be unique');
    const validStudents = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, schoolId: scopedSchoolId, role: 'STUDENT', isActive: true },
      select: { id: true },
    });
    if (validStudents.length !== uniqueIds.length) {
      throw new BadRequestException('All selected students must be active students in this school');
    }

    const existing = await this.prisma.enrollment.findMany({ where: { classId, studentId: { in: uniqueIds } }, select: { studentId: true } });
    const existingIds = new Set(existing.map((item) => item.studentId));
    const newEnrollments = uniqueIds.filter((studentId) => !existingIds.has(studentId));
    if (newEnrollments.length) {
      await this.prisma.enrollment.createMany({ data: newEnrollments.map((studentId) => ({ studentId, classId })), skipDuplicates: true });
    }
    return { created: newEnrollments.length, skipped: existingIds.size };
  }
}
