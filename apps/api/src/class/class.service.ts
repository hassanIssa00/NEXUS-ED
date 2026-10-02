import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto/create-class.dto';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) { }

  async create(createClassDto: CreateClassDto, schoolId: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    if (createClassDto.teacherId) await this.assertTeacherInSchool(createClassDto.teacherId, schoolId);
    return this.prisma.class.create({
      data: { ...createClassDto, schoolId },
    });
  }

  private async assertTeacherInSchool(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: teacherId, schoolId, role: 'TEACHER' },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found in this school');
  }

  async findAll(actorId: string, role: string, schoolId: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const where: any = { schoolId };
    if (role === 'TEACHER') {
      where.OR = [
        { teacherId: actorId },
        { classSubjects: { some: { teacherId: actorId } } },
      ];
    }
    const classes = await this.prisma.class.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { students: true, subjects: true },
        },
      },
    });

    return classes;
  }

  async findOne(id: string, actorId: string, role: string, schoolId: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const classEntity = await this.prisma.class.findFirst({
      where: { id, schoolId },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        classSubjects: { select: { teacherId: true } },
        students: {
          include: {
            student: { select: { id: true, name: true, firstName: true, lastName: true } },
          },
        },
        subjects: { select: { id: true, name: true, code: true, teacherId: true } },
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }
    const isTeacher = role === 'TEACHER' && (
      classEntity.teacherId === actorId || classEntity.classSubjects.some((subject) => subject.teacherId === actorId)
    );
    const isSchoolStaff = role !== 'TEACHER';
    if (!isTeacher && !isSchoolStaff) throw new ForbiddenException('You do not have access to this class');

    return classEntity;
  }

  async update(id: string, updateClassDto: UpdateClassDto, schoolId: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const existing = await this.prisma.class.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Class not found');
    if (updateClassDto.teacherId) await this.assertTeacherInSchool(updateClassDto.teacherId, schoolId);
    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
    });
  }

  async remove(id: string, schoolId: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const existing = await this.prisma.class.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Class not found');
    return this.prisma.class.delete({
      where: { id },
    });
  }

  async findStudentClasses(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            teacher: {
              select: { name: true }
            },
            scheduleEvents: {
              include: { subject: { select: { name: true } } },
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            },
            sessions: {
              where: { isActive: true },
              orderBy: { startTime: 'desc' },
              take: 1,
              select: { startTime: true, meetingUrl: true, title: true },
            },
          }
        }
      }
    });

    return enrollments.map(e => ({
      id: e.class.id,
      name: e.class.name,
      teacher: e.class.teacher?.name || null,
      schedule: e.class.scheduleEvents.map(event => ({
        dayOfWeek: event.dayOfWeek,
        startTime: event.startTime,
        endTime: event.endTime,
        room: event.room,
        subject: event.subject.name,
      })),
      nextClass: e.class.sessions[0]?.startTime || null,
      meetingUrl: e.class.sessions[0]?.meetingUrl || null,
      nextSessionTitle: e.class.sessions[0]?.title || null,
    }));
  }
}
