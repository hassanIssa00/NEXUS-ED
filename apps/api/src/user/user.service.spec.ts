import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UserService } from './user.service';

describe('UserService parent/student onboarding', () => {
  const parent = {
    id: 'parent-1',
    schoolId: 'school-1',
    name: 'Parent Name',
    phone: '+966501234567',
  };
  const student = {
    id: 'student-1',
    name: 'Student Name',
    email: 'student@example.test',
    role: Role.STUDENT,
    schoolId: 'school-1',
    isActive: true,
  };

  function createService(linkCode = {
    id: 'link-1',
    student,
  }) {
    const tx = {
      user: { findFirst: jest.fn().mockResolvedValue(parent) },
      studentLinkCode: {
        findFirst: jest.fn().mockResolvedValue(linkCode),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      parentStudent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'relation-1' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    return { service: new UserService(prisma as never), tx };
  }

  it('does not turn an incomplete code into a successful parent link', async () => {
    const { service, tx } = createService(null);

    await expect(service.redeemStudentLinkCode('parent-1', '4', 'mother'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.parentStudent.create).not.toHaveBeenCalled();
  });

  it('persists the parent relationship only after a valid student code is claimed', async () => {
    const { service, tx } = createService();

    await expect(service.redeemStudentLinkCode('parent-1', '0011223344556677', 'mother'))
      .resolves.toMatchObject({ student: { id: 'student-1' } });
    expect(tx.parentStudent.create).toHaveBeenCalledWith({
      data: { parentId: 'parent-1', studentId: 'student-1', relationship: 'mother' },
    });
    expect(tx.studentLinkCode.updateMany).toHaveBeenCalled();
  });

  it('returns parent-submitted intake answers in the student own-file report', async () => {
    const parentSurvey = { findMany: jest.fn().mockResolvedValue([]) };
    const service = new UserService({ parentSurvey } as never);

    await service.listMyIntakeSurveys('student-1', 'STUDENT');

    expect(parentSurvey.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 'student-1' },
      select: expect.objectContaining({
        answers: true,
        respondentRole: true,
        respondent: { select: { id: true, name: true, email: true, role: true } },
      }),
    }));
  });
});
