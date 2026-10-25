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

  it('shows parent survey answers inside a teacher-authorized student record without exposing parent contact details', async () => {
    const survey = {
      id: 'survey-1',
      respondentRole: 'PARENT',
      answers: { q1: '6 سنوات', q2: 'لا توجد حساسية' },
      consentedAt: new Date('2026-10-20T00:00:00.000Z'),
      createdAt: new Date('2026-10-19T00:00:00.000Z'),
      updatedAt: new Date('2026-10-20T00:00:00.000Z'),
      parent: { id: 'parent-1', name: 'ولي الأمر', email: 'private@example.test' },
      respondent: { id: 'parent-1', name: 'ولي الأمر', email: 'private@example.test', role: 'PARENT' },
    };
    const studentRecord = {
      ...student,
      firstName: 'Student',
      lastName: 'Name',
      phone: null,
      avatar: null,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      studentProfile: { gradeLevel: 1, nationalId: 'private-id', dateOfBirth: new Date('2019-01-01T00:00:00.000Z') },
      enrollments: [{ enrolledAt: new Date(), class: { id: 'class-1', name: 'أولى ابتدائي 1/2', academicYear: '1448', teacher: { id: 'teacher-1', name: 'المعلم' } } }],
      attendance: [],
      studentGrades: [],
      parents: [{ relationship: 'mother', parent: { id: 'parent-1', name: 'ولي الأمر', email: 'private@example.test', phone: '+966500000000' } }],
      placementAssessmentAttempts: [],
      childSurveys: [survey],
      smartProfile: null,
      skillMasteries: [],
    };
    const prisma = {
      enrollment: { findFirst: jest.fn().mockResolvedValue({ id: 'enrollment-1' }) },
      user: { findFirst: jest.fn().mockResolvedValue(studentRecord) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new UserService(prisma as never);

    const record = await service.getSchoolStudentRecord('student-1', 'school-1', 'teacher-1', 'TEACHER');

    expect(record.parentSurveys).toEqual([{
      surveyId: 'survey-1',
      respondentRole: 'PARENT',
      answers: { q1: '6 سنوات', q2: 'لا توجد حساسية' },
      consentedAt: survey.consentedAt,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
    }]);
    expect(record.parents[0].parent).toEqual({ id: 'parent-1', name: 'ولي الأمر', email: '', phone: null });
    expect(JSON.stringify(record)).not.toContain('private@example.test');
  });
});
