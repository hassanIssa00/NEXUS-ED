import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Role } from '../../auth/role.enum';
import { QrAttendanceController } from './qr-attendance.controller';
import { QrAttendanceService } from './qr-attendance.service';

describe('QR attendance access control', () => {
  const createQrSession = (args: { data: Record<string, unknown> }) =>
    Promise.resolve(args.data);
  const userFindUnique = jest.fn();
  const classFindFirst = jest.fn();
  const qrSessionCreate = jest.fn(createQrSession);
  let service: QrAttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QrAttendanceService({
      user: { findUnique: userFindUnique },
      class: { findFirst: classFindFirst },
      qrSession: { create: qrSessionCreate },
    } as unknown as PrismaService);
    userFindUnique.mockResolvedValue({
      role: 'TEACHER',
      schoolId: 'school-1',
      isActive: true,
    });
    classFindFirst.mockResolvedValue({ id: 'class-1' });
  });

  it('creates a session only for an assigned class in the teacher school', async () => {
    await service.createSession('teacher-1', 'class-1', 45);

    expect(classFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'class-1',
        schoolId: 'school-1',
        OR: [
          { teacherId: 'teacher-1' },
          { classSubjects: { some: { teacherId: 'teacher-1' } } },
        ],
      },
      select: { id: true },
    });
    expect(qrSessionCreate.mock.calls[0]?.[0].data).toMatchObject({
      teacherId: 'teacher-1',
      classId: 'class-1',
      isActive: true,
    });
  });

  it('rejects a user who is not an active teacher', async () => {
    userFindUnique.mockResolvedValue({
      role: 'STUDENT',
      schoolId: 'school-1',
      isActive: true,
    });

    await expect(service.createSession('student-1', 'class-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(classFindFirst).not.toHaveBeenCalled();
    expect(qrSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects sessions outside the teacher assignment and school', async () => {
    classFindFirst.mockResolvedValue(null);

    await expect(
      service.createSession('teacher-1', 'other-class'),
    ).rejects.toThrow(NotFoundException);
    expect(qrSessionCreate).not.toHaveBeenCalled();
  });

  it('bounds session duration before writing', async () => {
    await expect(
      service.createSession('teacher-1', 'class-1', 0),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createSession('teacher-1', 'class-1', 241),
    ).rejects.toThrow(BadRequestException);
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(qrSessionCreate).not.toHaveBeenCalled();
  });

  it('restricts QR-session management to teachers and scanning to students', () => {
    const prototype = QrAttendanceController.prototype as unknown as {
      createSession: object;
      scanQrCode: object;
    };
    const createRoles: unknown = Reflect.getMetadata(
      'roles',
      prototype.createSession,
    );
    const scanRoles: unknown = Reflect.getMetadata(
      'roles',
      prototype.scanQrCode,
    );
    expect(createRoles).toEqual([Role.TEACHER]);
    expect(scanRoles).toEqual([Role.STUDENT]);
  });
});
