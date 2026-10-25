import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MarkClassAttendanceDto } from './dto/mark-class-attendance.dto';
import { GeofenceCheckInDto } from './dto/geofence-check-in.dto';
import { UploadService } from '../upload/upload.service';

const DEFAULT_ATTENDANCE_TIME_ZONE = 'Asia/Riyadh';
const EARTH_RADIUS_METERS = 6_371_008.8;

type SchoolClock = {
  date: string;
  dayOfWeek: number;
  minuteOfDay: number;
};

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService, @Optional() private uploads?: UploadService) {}

  private async signStudentAvatars<T extends { avatar?: string | null }>(students: T[]): Promise<T[]> {
    const references = [...new Set(students
      .map((student) => student.avatar)
      .filter((value): value is string => Boolean(value) && /^(?:storage:\/\/|file:|https?:\/\/)/i.test(value!)))];
    if (!references.length || !this.uploads) return students;
    const signed = await this.uploads.getSignedUrlsForReferences(references).catch(() => references);
    const byReference = new Map(references.map((reference, index) => [reference, signed[index] || reference]));
    return students.map((student) => ({ ...student, avatar: student.avatar ? byReference.get(student.avatar) || student.avatar : student.avatar }));
  }

  private getSchoolClock(now = new Date()): SchoolClock {
    const timeZone = process.env.SCHOOL_TIME_ZONE?.trim() || DEFAULT_ATTENDANCE_TIME_ZONE;
    let parts: Record<string, string>;
    try {
      parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
          timeZone,
          weekday: 'short',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).formatToParts(now).map((part) => [part.type, part.value]),
      );
    } catch {
      throw new ServiceUnavailableException('The school attendance time zone is not configured correctly');
    }

    const dayOfWeek = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[parts.weekday];
    if (dayOfWeek === undefined) throw new ServiceUnavailableException('Unable to determine the school day');
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      dayOfWeek,
      minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
    };
  }

  private parseScheduleTime(value: string): number | null {
    const match = /^(\d{1,2}):([0-5]\d)$/.exec(value || '');
    if (!match) return null;
    const hours = Number(match[1]);
    if (hours < 0 || hours > 23) return null;
    return hours * 60 + Number(match[2]);
  }

  private distanceMeters(latitude: number, longitude: number, schoolLatitude: number, schoolLongitude: number) {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = toRadians(schoolLatitude - latitude);
    const longitudeDelta = toRadians(schoolLongitude - longitude);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(latitude)) * Math.cos(toRadians(schoolLatitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    const safeHaversine = Math.min(1, Math.max(0, haversine));
    return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(safeHaversine), Math.sqrt(1 - safeHaversine));
  }

  private async getStudentAttendanceContext(studentId: string, schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId, role: 'STUDENT', isActive: true },
      select: { id: true, schoolId: true },
    });
    if (!student) throw new NotFoundException('Active student account not found');

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, latitude: true, longitude: true, attendanceRadiusMeters: true },
    });
    if (!school) throw new NotFoundException('School not found');
    if (school.latitude === null || school.longitude === null) {
      throw new ServiceUnavailableException('The school attendance location has not been configured');
    }

    const clock = this.getSchoolClock();
    const scheduledEvents = await this.prisma.scheduleEvent.findMany({
      where: {
        dayOfWeek: clock.dayOfWeek,
        class: {
          schoolId,
          students: { some: { studentId } },
        },
      },
      select: {
        id: true,
        classId: true,
        dayOfWeek: true,
        periodNumber: true,
        startTime: true,
        endTime: true,
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ startTime: 'asc' }, { periodNumber: 'asc' }],
    });
    const currentPeriods = scheduledEvents.flatMap((event) => {
      const startMinute = this.parseScheduleTime(event.startTime);
      const endMinute = this.parseScheduleTime(event.endTime);
      if (startMinute === null || endMinute === null || endMinute <= startMinute) return [];
      if (clock.minuteOfDay < startMinute || clock.minuteOfDay >= endMinute) return [];
      return [{
        scheduleEventId: event.id,
        classId: event.classId,
        className: event.class.name,
        periodNumber: event.periodNumber,
        subjectId: event.subject.id,
        subjectName: event.subject.name,
        startTime: event.startTime,
        endTime: event.endTime,
      }];
    });

    const attendanceDate = new Date(`${clock.date}T00:00:00.000Z`);
    const existingChecks = currentPeriods.length
      ? await this.prisma.geofenceAttendance.findMany({
          where: {
            studentId,
            attendanceDate,
            scheduleEventId: { in: currentPeriods.map((period) => period.scheduleEventId) },
          },
          select: { scheduleEventId: true, checkedInAt: true },
        })
      : [];
    const checkedInAtByEventId = new Map(existingChecks.map((entry) => [entry.scheduleEventId, entry.checkedInAt]));

    return {
      school,
      clock,
      attendanceDate,
      currentPeriods: currentPeriods.map((period) => ({
        ...period,
        alreadyRecorded: checkedInAtByEventId.has(period.scheduleEventId),
        checkedInAt: checkedInAtByEventId.get(period.scheduleEventId) ?? null,
      })),
    };
  }

  async verifyStudentGeofenceAndCheckIn(studentId: string, schoolId: string | undefined, body: GeofenceCheckInDto) {
    const { school, clock, attendanceDate, currentPeriods } = await this.getStudentAttendanceContext(studentId, schoolId);
    const radiusMeters = Number.isFinite(school.attendanceRadiusMeters) && school.attendanceRadiusMeters > 0
      ? school.attendanceRadiusMeters
      : 50;
    const distance = this.distanceMeters(body.latitude, body.longitude, school.latitude, school.longitude);
    const roundedDistance = Math.round(distance);
    const roundedAccuracy = Math.ceil(body.accuracyMeters);

    if (distance > radiusMeters) {
      throw new ForbiddenException(`أنت خارج نطاق المدرسة: تبعد ${roundedDistance} متر، والحد المسموح ${radiusMeters} متر.`);
    }
    if (distance + body.accuracyMeters > radiusMeters) {
      throw new ForbiddenException(`دقة GPS الحالية ±${roundedAccuracy} متر لا تكفي لتأكيد وجودك داخل نطاق ${radiusMeters} متر. أعد تحديد موقعك من مكان مفتوح.`);
    }

    if (!currentPeriods.length) {
      return {
        allowed: true,
        schoolName: school.name,
        distanceMeters: roundedDistance,
        accuracyMeters: roundedAccuracy,
        radiusMeters,
        currentPeriods,
        checkIn: null,
        requiresPeriodSelection: false,
      };
    }

    const unrecordedPeriods = currentPeriods.filter((period) => !period.alreadyRecorded);
    const selectedPeriod = body.scheduleEventId
      ? currentPeriods.find((period) => period.scheduleEventId === body.scheduleEventId)
      : currentPeriods.length === 1
        ? currentPeriods[0]
        : unrecordedPeriods.length === 1
          ? unrecordedPeriods[0]
          : unrecordedPeriods.length === 0
            ? currentPeriods[0]
            : undefined;

    if (body.scheduleEventId && !selectedPeriod) {
      throw new BadRequestException('الحصة المحددة ليست ضمن جدولك الحالي أو انتهى وقتها. أعد فحص الموقع والجدول.');
    }

    if (!selectedPeriod) {
      return {
        allowed: true,
        schoolName: school.name,
        distanceMeters: roundedDistance,
        accuracyMeters: roundedAccuracy,
        radiusMeters,
        currentPeriods,
        checkIn: null,
        requiresPeriodSelection: true,
      };
    }

    const classId = selectedPeriod.classId;
    const scheduleEventId = selectedPeriod.scheduleEventId;
    const notes = `حضور جغرافي للحصة ${selectedPeriod.periodNumber}: ${selectedPeriod.subjectName}`;
    const checkIn = await this.prisma.$transaction(async (tx) => {
      const existingCheckIn = await tx.geofenceAttendance.findUnique({
        where: { studentId_scheduleEventId_attendanceDate: { studentId, scheduleEventId, attendanceDate } },
        select: { id: true },
      });
      const recorded = await tx.geofenceAttendance.upsert({
        where: { studentId_scheduleEventId_attendanceDate: { studentId, scheduleEventId, attendanceDate } },
        update: { distanceMeters: distance, accuracyMeters: body.accuracyMeters },
        create: {
          studentId,
          classId,
          scheduleEventId,
          attendanceDate,
          distanceMeters: distance,
          accuracyMeters: body.accuracyMeters,
        },
      });
      await tx.attendance.upsert({
        where: { studentId_classId_date: { studentId, classId, date: attendanceDate } },
        update: { status: 'PRESENT', notes },
        create: { studentId, classId, date: attendanceDate, status: 'PRESENT', notes },
      });
      if (!existingCheckIn) {
        await tx.auditLog.create({
          data: {
            schoolId: school.id,
            userId: studentId,
            action: 'attendance.student.geofence_check_in',
            entityType: 'schedule_event',
            entityId: scheduleEventId,
            metadata: {
              classId,
              scheduleEventId,
              periodNumber: selectedPeriod.periodNumber,
              subjectName: selectedPeriod.subjectName,
              date: clock.date,
              distanceMeters: roundedDistance,
              accuracyMeters: roundedAccuracy,
              radiusMeters,
            },
          },
        });
      }
      return { recorded, alreadyRecorded: Boolean(existingCheckIn) };
    });

    return {
      allowed: true,
      schoolName: school.name,
      distanceMeters: roundedDistance,
      accuracyMeters: roundedAccuracy,
      radiusMeters,
      currentPeriods: currentPeriods.map((period) => ({
        ...period,
        alreadyRecorded: period.scheduleEventId === scheduleEventId || period.alreadyRecorded,
      })),
      checkIn: {
        id: checkIn.recorded.id,
        scheduleEventId: checkIn.recorded.scheduleEventId,
        className: selectedPeriod.className,
        subjectName: selectedPeriod.subjectName,
        periodNumber: selectedPeriod.periodNumber,
        startTime: selectedPeriod.startTime,
        endTime: selectedPeriod.endTime,
        checkedInAt: checkIn.recorded.checkedInAt,
        alreadyRecorded: checkIn.alreadyRecorded,
      },
      requiresPeriodSelection: false,
    };
  }

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
    const students = await this.signStudentAvatars(enrollments.map((item) => item.student));
    return { class: { id: classroom.id, name: classroom.name }, date, students, records };
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
