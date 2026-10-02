import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MarkClassAttendanceDto } from './dto/mark-class-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private async authorizeClass(classId: string, actorId: string, role: string, schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const classroom = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        name: true,
        schoolId: true,
        teacherId: true,
        classSubjects: { select: { teacherId: true } },
      },
    });
    if (!classroom) throw new NotFoundException('Class not found');

    const isAssignedTeacher = role === 'TEACHER' && (
      classroom.teacherId === actorId || classroom.classSubjects.some((subject) => subject.teacherId === actorId)
    );
    const isSchoolStaff = role !== 'TEACHER';
    if (!isAssignedTeacher && !isSchoolStaff) {
      throw new ForbiddenException('You do not have access to this class');
    }
    return classroom;
  }

  private parseDay(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      throw new BadRequestException('date must use YYYY-MM-DD format');
    }
    const start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
      throw new BadRequestException('date is invalid');
    }
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }

  async getClassAttendance(classId: string, date: string, actorId: string, role: string, schoolId: string) {
    const classroom = await this.authorizeClass(classId, actorId, role, schoolId);
    const { start, end } = this.parseDay(date);
    const [enrollments, records] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { classId },
        include: {
          student: { select: { id: true, name: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { student: { name: 'asc' } },
      }),
      this.prisma.attendance.findMany({
        where: { classId, date: { gte: start, lt: end } },
        select: { studentId: true, status: true, notes: true, updatedAt: true },
      }),
    ]);
    return { class: { id: classroom.id, name: classroom.name }, date, students: enrollments.map((item) => item.student), records };
  }

  async markClassAttendance(
    classId: string,
    body: MarkClassAttendanceDto,
    actorId: string,
    role: string,
    schoolId: string,
  ) {
    const classroom = await this.authorizeClass(classId, actorId, role, schoolId);
    const { start } = this.parseDay(body.date);
    const studentIds = body.entries.map((entry) => entry.studentId);
    if (new Set(studentIds).size !== studentIds.length) {
      throw new BadRequestException('Each student may appear only once');
    }
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, studentId: { in: studentIds } },
      select: { studentId: true },
    });
    if (enrollments.length !== studentIds.length) {
      throw new BadRequestException('Attendance includes a student who is not enrolled in this class');
    }

    const records = await this.prisma.$transaction(
      body.entries.map((entry) => this.prisma.attendance.upsert({
        where: { studentId_classId_date: { studentId: entry.studentId, classId, date: start } },
        update: { status: entry.status, notes: entry.notes || null },
        create: { studentId: entry.studentId, classId, date: start, status: entry.status, notes: entry.notes || null },
      })),
    );
    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorId,
        action: 'attendance.class.marked',
        entityType: 'class',
        entityId: classId,
        metadata: {
          date: body.date,
          count: records.length,
          statuses: body.entries.reduce<Record<string, number>>((totals, entry) => {
            totals[entry.status] = (totals[entry.status] || 0) + 1;
            return totals;
          }, {}),
        },
      },
    });
    return { class: { id: classroom.id, name: classroom.name }, date: body.date, savedCount: records.length };
  }

  async getMyAttendance(studentId: string) {
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: { studentId },
      include: {
        class: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    const totalDays = attendanceRecords.length;
    const present = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const absent = attendanceRecords.filter(a => a.status === 'ABSENT').length;
    const late = attendanceRecords.filter(a => a.status === 'LATE').length;

    const attendanceRate = totalDays > 0 ? Number(((present / totalDays) * 100).toFixed(1)) : null;

    // Get last 5 records for weekly overview
    const weeklyOverview = attendanceRecords.slice(0, 5).map(a => ({
      day: new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' }),
      status: a.status.charAt(0) + a.status.slice(1).toLowerCase(),
      date: a.date.toISOString().split('T')[0]
    }));

    const history = attendanceRecords.map(a => ({
      date: a.date.toISOString().split('T')[0],
      status: a.status.charAt(0) + a.status.slice(1).toLowerCase(),
      subject: a.class?.name || 'Class'
    }));

    return {
      summary: {
        present,
        absent,
        late,
        totalDays,
        attendanceRate,
      },
      weeklyOverview,
      history
    };
  }
}
