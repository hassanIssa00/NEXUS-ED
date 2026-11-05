import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UploadService } from '../upload/upload.service';

const PARENT_SURVEY_OPTIONS: Record<string, readonly string[]> = {
  q1: ['ط£ظ‚ظ„ ظ…ظ† 6 ط³ظ†ظˆط§طھ', '6 ط¥ظ„ظ‰ 10 ط³ظ†ظˆط§طھ', '11 ط¥ظ„ظ‰ 15 ط³ظ†ط©', 'ط£ظƒط«ط± ظ…ظ† 15 ط³ظ†ط©'],
  q2: ['ظ„ط§ طھظˆط¬ط¯', 'ط­ط³ط§ط³ظٹط© ط·ط¹ط§ظ…', 'ط­ط§ظ„ط© طµط­ظٹط© طھط­طھط§ط¬ ظ…طھط§ط¨ط¹ط©'],
  q3: ['9 ط¥ظ„ظ‰ 10 ط³ط§ط¹ط§طھ', '7 ط¥ظ„ظ‰ 8 ط³ط§ط¹ط§طھ', 'ط£ظ‚ظ„ ظ…ظ† 7 ط³ط§ط¹ط§طھ'],
  q4: ['ط£ظ‚ظ„ ظ…ظ† ط³ط§ط¹ط©', 'ط³ط§ط¹ط© ط¥ظ„ظ‰ ط³ط§ط¹طھظٹظ†', 'ط£ظƒط«ط± ظ…ظ† ط³ط§ط¹طھظٹظ†'],
  q5: ['ط¨ط·ظ„ط§ظ‚ط©', 'ظٹط­طھط§ط¬ ط¥ظ„ظ‰ طھط´ط¬ظٹط¹', 'ظٹظˆط§ط¬ظ‡ طµط¹ظˆط¨ط© ط£ط­ظٹط§ظ†ط§ظ‹'],
  q6: ['ط§ظ‡طھظ…ط§ظ… ظƒط¨ظٹط±', 'ط§ظ‡طھظ…ط§ظ… ظ…طھظˆط³ط·', 'ظٹظپط¶ظ„ ط£ظ†ط´ط·ط© ط£ط®ط±ظ‰'],
  q7: ['ظ„ط§ طھظˆط¬ط¯', 'ط£ط­ظٹط§ظ†ط§ظ‹', 'طھظˆط¬ط¯ طµط¹ظˆط¨ط© ظ…ظ„ط­ظˆط¸ط©'],
  q8: ['ظٹظ†ط¯ظ…ط¬ ط¨ط³ظ‡ظˆظ„ط©', 'ظٹط­طھط§ط¬ ظˆظ‚طھط§ظ‹ ظ„ظ„ط§ظ†ط¯ظ…ط§ط¬', 'ظٹظپط¶ظ„ ط§ظ„ط£ظ†ط´ط·ط© ط§ظ„ظپط±ط¯ظٹط©'],
  q9: ['ط¨ظ…ط±ظˆظ†ط© ط؛ط§ظ„ط¨ط§ظ‹', 'ظٹط­طھط§ط¬ ط¥ظ„ظ‰ طھط°ظƒظٹط±', 'ظٹط­طھط§ط¬ ط¥ظ„ظ‰ ظ…طھط§ط¨ط¹ط© ط¥ط¶ط§ظپظٹط©'],
  q10: ['ط¨ظ‡ط¯ظˆط،', 'ظٹط­طھط§ط¬ طھط°ظƒظٹط±ط§ظ‹ ط¨ط³ظٹط·ط§ظ‹', 'ظٹط¬ط¯ طµط¹ظˆط¨ط© ظپظٹ ط§ظ„ط§ظ†طھط¸ط§ط±'],
  q11: ['ظٹط±ظƒط² ط¨ط§ط³طھظ…ط±ط§ط±', 'ظٹطھط´طھطھ ط£ط­ظٹط§ظ†ط§ظ‹', 'ظٹط­طھط§ط¬ ظپظˆط§طµظ„ ط­ط±ظƒط©'],
  q12: ['ظٹط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰', 'ظٹط·ظ„ط¨ ط§ظ„ظ…ط³ط§ط¹ط¯ط©', 'ظٹظ†ط²ط¹ط¬ ظˆظٹط­طھط§ط¬ طھط´ط¬ظٹط¹ط§ظ‹'],
  q13: ['ظ…ظ„طھط²ظ… ط؛ط§ظ„ط¨ط§ظ‹', 'ظٹط­طھط§ط¬ طھط°ظƒظٹط±ط§ظ‹', 'ظٹط­طھط§ط¬ ظ…طھط§ط¨ط¹ط© ظ…ط³طھظ…ط±ط©'],
  q14: ['ط§ظ„ط£ط¨ ظˆط§ظ„ط£ظ… ظ…ط¹ط§ظ‹', 'ط§ظ„ط£ظ… ط؛ط§ظ„ط¨ط§ظ‹', 'ط§ظ„ط£ط¨ ط؛ط§ظ„ط¨ط§ظ‹', 'ط´ط®طµ ط¢ط®ط±'],
  q15: ['ط§ظ„طھط­طµظٹظ„ ط§ظ„ط¯ط±ط§ط³ظٹ', 'ط¨ظ†ط§ط، ط§ظ„ط´ط®طµظٹط© ظˆط§ظ„ط«ظ‚ط©', 'طھظ†ظ…ظٹط© ط§ظ„ظ…ظ‡ط§ط±ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©', 'ط¬ظ…ظٹط¹ ظ…ط§ ط³ط¨ظ‚'],
};

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService, @Optional() private uploads?: UploadService) { }

  private async signAvatarReferences<T extends { avatar?: string | null }>(users: T[]): Promise<T[]> {
    const references = [...new Set(users
      .map((user) => user.avatar)
      .filter((value): value is string => Boolean(value) && /^(?:storage:\/\/|file:|https?:\/\/)/i.test(value)))];
    if (!references.length || !this.uploads) return users;
    const signed = await this.uploads.getSignedUrlsForReferences(references).catch(() => references);
    const byReference = new Map(references.map((reference, index) => [reference, signed[index] || reference]));
    return users.map((user) => ({ ...user, avatar: user.avatar ? byReference.get(user.avatar) || user.avatar : user.avatar }));
  }

  private requireSchool(schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    return schoolId;
  }

  async findAll(filters: UserFilterDto = {}, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const { role, search } = filters;
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { schoolId: scopedSchoolId };
    where.AND = [{ OR: [{ role: { notIn: [Role.STUDENT, Role.TEACHER] } }, { emailVerified: true }] }];

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          role: true,
          phone: true,
          avatar: true,
          isActive: true,
          emailVerified: true,
          lastActiveDate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: await this.signAvatarReferences(users),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Return the school principal's public display name for official report stamps. */
  async getSchoolPrincipal(schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const principal = await this.prisma.user.findFirst({
      where: { schoolId: scopedSchoolId, role: Role.PRINCIPAL, isActive: true, emailVerified: true },
      select: { name: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    const fallback = principal ?? await this.prisma.user.findFirst({
      where: { schoolId: scopedSchoolId, role: Role.ADMIN, isActive: true, emailVerified: true },
      select: { name: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    const name = fallback?.name || [fallback?.firstName, fallback?.lastName].filter(Boolean).join(' ') || fallback?.email || null;
    return { name, role: fallback?.role ?? null };
  }

  async findById(id: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId: scopedSchoolId, NOT: { role: { in: [Role.STUDENT, Role.TEACHER] }, emailVerified: false } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        lastActiveDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const [signedUser] = await this.signAvatarReferences([user]);
    return signedUser;
  }

  async getSchoolStudentRecord(id: string, schoolId: string | undefined, actorId: string, actorRole: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const normalizedActorRole = String(actorRole).toUpperCase();
    const isTeacher = normalizedActorRole === Role.TEACHER;
    const teacherClassScope: Prisma.ClassWhereInput = {
      schoolId: scopedSchoolId,
      OR: [
        { teacherId: actorId },
        { classSubjects: { some: { teacherId: actorId } } },
      ],
    };

    // A teacher can open records only for students enrolled in a class they teach.
    // Keep every class-based part of the response inside that same scope.
    if (isTeacher) {
      const assignedEnrollment = await this.prisma.enrollment.findFirst({
        where: { studentId: id, class: teacherClassScope },
        select: { id: true },
      });
      if (!assignedEnrollment) throw new ForbiddenException('You do not have access to this student record');
    }

    const visibleClassScope: Prisma.ClassWhereInput = isTeacher
      ? teacherClassScope
      : { schoolId: scopedSchoolId };
    const student = await this.prisma.user.findFirst({
      where: { id, schoolId: scopedSchoolId, role: Role.STUDENT, emailVerified: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        studentProfile: { select: { gradeLevel: true, nationalId: true, dateOfBirth: true } },
        enrollments: {
          where: { class: visibleClassScope },
          orderBy: { enrolledAt: 'desc' },
          select: {
            enrolledAt: true,
            class: {
              select: {
                id: true,
                name: true,
                academicYear: true,
                teacher: { select: { id: true, name: true } },
              },
            },
          },
        },
        attendance: {
          where: { class: visibleClassScope },
          orderBy: { date: 'desc' },
          take: 100,
          select: { id: true, date: true, status: true, notes: true, class: { select: { id: true, name: true } } },
        },
        studentGrades: {
          where: { subject: { class: visibleClassScope } },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            score: true,
            grade: true,
            maxScore: true,
            comments: true,
            createdAt: true,
            subject: { select: { id: true, name: true } },
            assignment: { select: { id: true, title: true } },
          },
        },
        parents: {
          where: { parent: { schoolId: scopedSchoolId } },
          select: { relationship: true, parent: { select: { id: true, name: true, email: true, phone: true } } },
        },
        placementAssessmentAttempts: {
          where: { schoolId: scopedSchoolId },
          orderBy: { completedAt: 'desc' },
          select: { id: true, gradeLevel: true, assessmentKey: true, answers: true, questionSnapshot: true, correctCount: true, questionCount: true, score: true, completedAt: true },
        },
        childSurveys: {
          where: { schoolId: scopedSchoolId },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            parentId: true,
            respondentId: true,
            respondentRole: true,
            answers: true,
            consentedAt: true,
            consentVersion: true,
            createdAt: true,
            updatedAt: true,
            parent: { select: { id: true, name: true, email: true } },
            respondent: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        smartProfile: { select: { learningStyle: true, strengthSubjects: true, weakSubjects: true, performanceTrend: true } },
        skillMasteries: {
          where: { skillNode: { subject: { class: visibleClassScope } } },
          select: { id: true, masteryLevel: true, skillNode: { select: { name: true, subject: { select: { name: true } } } } },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found in this school');
    const [studentWithSignedAvatar] = await this.signAvatarReferences([student]);

    await this.prisma.auditLog.create({
      data: {
        schoolId: scopedSchoolId,
        userId: actorId,
        action: 'student.record_viewed',
        entityType: 'student',
        entityId: id,
      },
    });

    const includeSensitiveResponses = ['ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'COUNSELOR'].includes(normalizedActorRole);
    const includeAssessmentAnswers = includeSensitiveResponses || isTeacher;
    const placementAssessmentAttempts = student.placementAssessmentAttempts.map((attempt) => {
      const answers = (attempt.answers ?? {}) as Record<string, string>;
      const questions = (attempt.questionSnapshot ?? []) as Array<{
        id: string;
        category?: string;
        prompt?: string;
        correctAnswer?: string;
        explanation?: string;
      }>;
      const detailedAnswers = questions.map((question) => ({
        id: question.id,
        category: question.category ?? 'ط¹ط§ظ…',
        prompt: question.prompt ?? '',
        selectedAnswer: answers[question.id] ?? null,
        correctAnswer: question.correctAnswer ?? null,
        isCorrect: Boolean(question.correctAnswer) && answers[question.id] === question.correctAnswer,
        explanation: question.explanation ?? '',
      }));
      const categories = new Map<string, { total: number; correct: number }>();
      for (const answer of detailedAnswers) {
        const score = categories.get(answer.category) ?? { total: 0, correct: 0 };
        score.total += 1;
        if (answer.isCorrect) score.correct += 1;
        categories.set(answer.category, score);
      }
      const weakAreas = [...categories.entries()]
        .map(([category, score]) => ({ category, total: score.total, correct: score.correct, incorrect: score.total - score.correct, accuracy: Math.round((score.correct / score.total) * 100) }))
        .filter((area) => area.incorrect > 0)
        .sort((left, right) => left.accuracy - right.accuracy || right.incorrect - left.incorrect);
      return {
        id: attempt.id,
        gradeLevel: attempt.gradeLevel,
        assessmentKey: attempt.assessmentKey,
        correctCount: attempt.correctCount,
        questionCount: attempt.questionCount,
        score: attempt.score,
        completedAt: attempt.completedAt,
        ...(includeAssessmentAnswers ? { answers: detailedAnswers, weakAreas } : {}),
      };
    });
    // The teacher was already checked against this student's assigned class
    // above. Return the submitted answers for that scoped record, without the
    // linked parent's contact details.
    const parentSurveys = isTeacher
      ? student.childSurveys.map(({ id: surveyId, respondentRole, answers, consentedAt, createdAt, updatedAt }) => ({ surveyId, respondentRole, answers, consentedAt, createdAt, updatedAt }))
      : includeSensitiveResponses
      ? student.childSurveys
      : student.childSurveys.map(({ answers: _answers, ...survey }) => ({ ...survey, answers: undefined }));
    const { placementAssessmentAttempts: _attempts, childSurveys: _surveys, ...studentRecord } = studentWithSignedAvatar;
    const teacherSafeRecord = isTeacher
      ? {
          ...studentRecord,
          studentProfile: studentRecord.studentProfile ? { gradeLevel: studentRecord.studentProfile.gradeLevel, nationalId: null, dateOfBirth: null } : null,
          parents: studentRecord.parents.map(({ relationship, parent }) => ({ relationship, parent: { id: parent.id, name: parent.name, email: '', phone: null } })),
        }
      : studentRecord;
    return { ...teacherSafeRecord, placementAssessmentAttempts, parentSurveys };
  }

  async recordActivity(userId: string) {
    const lastActiveDate = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveDate },
      select: { id: true },
    });
    return { lastActiveDate };
  }

  async findStaff(filters: UserFilterDto = {}, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    if (filters.role === Role.STUDENT || filters.role === Role.PARENT) {
      throw new BadRequestException('This endpoint is limited to school staff');
    }
    const where: any = {
      schoolId: scopedSchoolId,
      role: filters.role || { notIn: [Role.STUDENT, Role.PARENT] },
    };

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [staff, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          role: true,
          phone: true,
          avatar: true,
          isActive: true,
          lastActiveDate: true,
          createdAt: true,
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: await this.signAvatarReferences(staff),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: CreateUserDto, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Accounts provisioned by an admin are pre-verified (no Firebase flow needed)
    // and must change their temporary password on first sign-in.
    const isProvisionedRole = data.role === Role.STUDENT || data.role === Role.TEACHER || data.role === Role.PARENT;

    return this.prisma.user.create({
      data: {
        ...data,
        schoolId: scopedSchoolId,
        name: data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.email.split('@')[0]),
        password: hashedPassword,
        emailVerified: true,
        mustChangePassword: isProvisionedRole,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: UpdateUserDto, schoolId?: string, actorId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const existing = await this.prisma.user.findFirst({
      where: { id, schoolId: scopedSchoolId },
      select: { id: true, name: true, firstName: true, lastName: true },
    });
    if (!existing) throw new NotFoundException('User not found');
    if (actorId === id && (data.name !== undefined || data.firstName !== undefined || data.lastName !== undefined)) {
      const currentName = existing.name?.trim()
        || [existing.firstName, existing.lastName].filter((part) => part?.trim()).join(' ').trim();
      const normalizeName = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('ar');
      const attemptedRename = (data.name !== undefined && normalizeName(data.name) !== normalizeName(currentName))
        || (data.firstName !== undefined && normalizeName(data.firstName ?? '') !== normalizeName(existing.firstName ?? ''))
        || (data.lastName !== undefined && normalizeName(data.lastName ?? '') !== normalizeName(existing.lastName ?? ''));
      if (attemptedRename) {
        throw new BadRequestException('ظ„ط§ ظٹظ…ظƒظ† طھط؛ظٹظٹط± ط§ظ„ط§ط³ظ… ط§ظ„ظ…ط³ط¬ظ„ ظپظٹ ط­ط³ط§ط¨ظƒ');
      }
    }
    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async updateSelfProfile(id: string, data: UpdateUserDto, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const existing = await this.prisma.user.findFirst({
      where: { id, schoolId: scopedSchoolId },
      select: { id: true, name: true, firstName: true, lastName: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (data.firstName !== undefined || data.lastName !== undefined) {
      throw new BadRequestException('ظ„ط§ ظٹظ…ظƒظ† طھط¹ط¯ظٹظ„ ط§ظ„ط§ط³ظ… ط§ظ„ظ…ط³ط¬ظ„ ظ…ظ† ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط­ط³ط§ط¨');
    }

    const existingName = existing.name?.trim()
      || [existing.firstName, existing.lastName].filter((part) => part?.trim()).join(' ').trim();
    const requestedName = typeof data.name === 'string' ? data.name.trim().replace(/\s+/g, ' ') : undefined;
    const normalized = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('ar');

    if (requestedName && existingName && normalized(requestedName) !== normalized(existingName)) {
      throw new BadRequestException('ط§ظ„ط§ط³ظ… ظ…ط±طھط¨ط· ط¨ط³ط¬ظ„ ط§ظ„ظ…ط¯ط±ط³ط© ظˆظ„ط§ ظٹظ…ظƒظ† طھط؛ظٹظٹط±ظ‡ ظ…ظ† ط§ظ„ط­ط³ط§ط¨');
    }
    if (requestedName && !existingName && requestedName.length < 2) {
      throw new BadRequestException('ط£ط¯ط®ظ„ ط§ظ„ط§ط³ظ… ط§ظ„ظƒط§ظ…ظ„');
    }

    const editableData: UpdateUserDto = {};
    if (data.phone !== undefined) editableData.phone = data.phone;
    if (requestedName && !existingName) editableData.name = requestedName;
    return this.update(id, editableData, scopedSchoolId);
  }

  async delete(id: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const existing = await this.prisma.user.findFirst({ where: { id, schoolId: scopedSchoolId }, select: { id: true } });
    if (!existing) throw new NotFoundException('User not found');
    // Soft delete by setting isActive to false
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getStats(schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const [total, students, teachers, parents, admins, principals, vicePrincipals, counselors, supervisors, accountants, hr] = await Promise.all([
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, isActive: true, OR: [{ role: { notIn: [Role.STUDENT, Role.TEACHER] } }, { emailVerified: true }] } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: Role.STUDENT, isActive: true, emailVerified: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: Role.TEACHER, isActive: true, emailVerified: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'PARENT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'ADMIN', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'PRINCIPAL', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'VICE_PRINCIPAL', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'COUNSELOR', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'SUPERVISOR', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'ACCOUNTANT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'HR', isActive: true } }),
    ]);

    return {
      total,
      students,
      teachers,
      parents,
      admins,
      principals,
      vicePrincipals,
      counselors,
      supervisors,
      accountants,
      hr,
    };
  }

  async getStudentProfile(userId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.STUDENT, isActive: true },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student account not found');
    return this.prisma.studentProfile.findUnique({ where: { userId } });
  }

  async saveStudentProfile(userId: string, gradeLevel: number, dateOfBirth?: string, nationalId?: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.STUDENT, isActive: true },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student account not found');

    if (nationalId !== undefined) {
      const duplicate = await this.prisma.studentProfile.findFirst({
        where: { nationalId, userId: { not: userId } },
        select: { userId: true },
      });
      if (duplicate) throw new ConflictException('ط±ظ‚ظ… ط§ظ„ظ‡ظˆظٹط© ظ…ط±طھط¨ط· ط¨ط­ط³ط§ط¨ ط·ط§ظ„ط¨ ط¢ط®ط±');
    }

    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
        throw new BadRequestException('Date of birth must be a valid date in the past');
      }
    }

    try {
      return await this.prisma.studentProfile.upsert({
        where: { userId },
        create: {
          userId,
          gradeLevel,
          ...(nationalId !== undefined ? { nationalId } : {}),
          ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
        },
        update: {
          gradeLevel,
          ...(nationalId !== undefined ? { nationalId } : {}),
          ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('ط±ظ‚ظ… ط§ظ„ظ‡ظˆظٹط© ظ…ط±طھط¨ط· ط¨ط­ط³ط§ط¨ ط·ط§ظ„ط¨ ط¢ط®ط±');
      }
      throw error;
    }
  }

  async createStudentLinkCode(studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: Role.STUDENT, isActive: true, schoolId: { not: null } },
      select: {
        id: true,
        schoolId: true,
        avatar: true,
        studentProfile: { select: { gradeLevel: true, nationalId: true } },
      },
    });
    if (!student?.schoolId) throw new ForbiddenException('Student account is not assigned to an active school');
    if (student.studentProfile?.gradeLevel == null || !student.studentProfile.nationalId || !student.avatar) {
      throw new BadRequestException('ط£ظƒظ…ظ„ ط§ظ„طµظپ ظˆط±ظ‚ظ… ط§ظ„ظ‡ظˆظٹط© ظˆطµظˆط±ط© ط§ظ„ط·ط§ظ„ط¨ ظ‚ط¨ظ„ ط¥طµط¯ط§ط± ط±ظ…ط² ظˆظ„ظٹ ط§ظ„ط£ظ…ط±');
    }

    const code = randomBytes(8).toString('hex').toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.studentLinkCode.updateMany({
        where: { studentId, redeemedAt: null, expiresAt: { gt: now } },
        data: { expiresAt: now },
      });
      await tx.studentLinkCode.create({
        data: { studentId, tokenHash: createHash('sha256').update(code).digest('hex'), expiresAt },
      });
      await tx.auditLog.create({
        data: {
          schoolId: student.schoolId,
          userId: studentId,
          action: 'parent_link.code_issued',
          entityType: 'student_link_code',
          entityId: studentId,
          metadata: { expiresAt: expiresAt.toISOString() },
        },
      });
    });

    return { code, expiresAt };
  }

  async redeemStudentLinkCode(parentId: string, rawCode: string, relationship: string) {
    const codeHash = createHash('sha256').update(rawCode.trim().toUpperCase()).digest('hex');
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.user.findFirst({
        where: { id: parentId, role: Role.PARENT, isActive: true, schoolId: { not: null } },
        select: { id: true, schoolId: true, name: true, phone: true },
      });
      if (!parent?.schoolId) throw new ForbiddenException('Parent account is not assigned to an active school');
      if (!parent.name?.trim() || !parent.phone?.trim()) {
        throw new BadRequestException('ط£ظƒظ…ظ„ ط§ط³ظ… ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ظˆط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„ ظ‚ط¨ظ„ ط±ط¨ط· ط­ط³ط§ط¨ ط§ظ„ط·ط§ظ„ط¨');
      }

      const linkCode = await tx.studentLinkCode.findFirst({
        where: { tokenHash: codeHash, redeemedAt: null, expiresAt: { gt: now } },
        include: { student: { select: { id: true, name: true, email: true, role: true, schoolId: true, isActive: true } } },
      });
      if (!linkCode || !linkCode.student.isActive || linkCode.student.role !== Role.STUDENT) {
        throw new BadRequestException('ط±ظ…ط² ط§ظ„ط±ط¨ط· ط؛ظٹط± طµط§ظ„ط­ ط£ظˆ ظ…ظ†طھظ‡ظٹ ط§ظ„طµظ„ط§ط­ظٹط©');
      }
      if (linkCode.student.schoolId !== parent.schoolId) {
        throw new ForbiddenException('ط±ظ…ط² ط§ظ„ط±ط¨ط· ظ„ط§ ظٹط®طµ ط­ط³ط§ط¨ط§ظ‹ ظپظٹ ظ…ط¯ط±ط³طھظƒ');
      }

      const existingLink = await tx.parentStudent.findUnique({
        where: { parentId_studentId: { parentId, studentId: linkCode.student.id } },
        select: { id: true },
      });
      if (existingLink) throw new ConflictException('ظ‡ط°ط§ ط§ظ„ط·ط§ظ„ط¨ ظ…ط±طھط¨ط· ط¨ط­ط³ط§ط¨ظƒ ط¨ط§ظ„ظپط¹ظ„');

      const claimed = await tx.studentLinkCode.updateMany({
        where: { id: linkCode.id, redeemedAt: null, expiresAt: { gt: now } },
        data: { redeemedAt: now, redeemedById: parentId },
      });
      if (claimed.count !== 1) throw new ConflictException('ط±ظ…ط² ط§ظ„ط±ط¨ط· ط§ط³طھظڈط®ط¯ظ… ط¨ط§ظ„ظپط¹ظ„');

      await tx.parentStudent.create({ data: { parentId, studentId: linkCode.student.id, relationship } });
      await tx.auditLog.create({
        data: {
          schoolId: parent.schoolId,
          userId: parentId,
          action: 'parent_link.student_linked',
          entityType: 'parent_student',
          entityId: linkCode.student.id,
          metadata: { studentId: linkCode.student.id },
        },
      });

      return {
        student: { id: linkCode.student.id, name: linkCode.student.name ?? linkCode.student.email },
        linkedAt: now,
      };
    });
  }

  async submitParentSurvey(respondentId: string, respondentRole: string, studentId: string, answers: Record<string, string>, consent: boolean) {
    if (consent !== true) throw new BadRequestException('ظٹظ„ط²ظ… ط§ظ„ظ…ظˆط§ظپظ‚ط© ط¹ظ„ظ‰ ط§ط³طھط®ط¯ط§ظ… ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ط³طھط¨ظٹط§ظ†');
    const keys = Object.keys(answers ?? {});
    if (keys.length !== Object.keys(PARENT_SURVEY_OPTIONS).length || keys.some((key) => !PARENT_SURVEY_OPTIONS[key])) {
      throw new BadRequestException('ظٹط±ط¬ظ‰ ط§ظ„ط¥ط¬ط§ط¨ط© ط¹ظ† ط¬ظ…ظٹط¹ ط£ط³ط¦ظ„ط© ط§ظ„ط§ط³طھط¨ظٹط§ظ†');
    }
    for (const [questionId, answer] of Object.entries(answers)) {
      if (typeof answer !== 'string' || !PARENT_SURVEY_OPTIONS[questionId].includes(answer)) {
        throw new BadRequestException('طھط­طھظˆظٹ ط§ظ„ط¥ط¬ط§ط¨ط§طھ ط¹ظ„ظ‰ ظ‚ظٹظ…ط© ط؛ظٹط± طµط§ظ„ط­ط©');
      }
    }

    const role = String(respondentRole).toUpperCase();
    if (role !== Role.PARENT && role !== Role.STUDENT) throw new ForbiddenException('ظ‡ط°ط§ ط§ظ„ط§ط³طھط¨ظٹط§ظ† ظ…طھط§ط­ ظ„ظ„ط·ط§ظ„ط¨ ط£ظˆ ظˆظ„ظٹ ط£ظ…ط±ظ‡ ظپظ‚ط·');
    const respondent = await this.prisma.user.findFirst({
      where: { id: respondentId, role, isActive: true, schoolId: { not: null } },
      select: { id: true, schoolId: true },
    });
    if (!respondent?.schoolId) throw new ForbiddenException('ط§ظ„ط­ط³ط§ط¨ ط؛ظٹط± ظ…ط±طھط¨ط· ط¨ظ…ط¯ط±ط³ط©');
    if (role === Role.STUDENT && studentId !== respondentId) {
      throw new ForbiddenException('ظٹظ…ظƒظ† ظ„ظ„ط·ط§ظ„ط¨ طھط¹ط¨ط¦ط© ط§ط³طھط¨ظٹط§ظ† ظ…ظ„ظپظ‡ ظپظ‚ط·');
    }
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: Role.STUDENT, isActive: true, schoolId: respondent.schoolId },
      select: { id: true },
    });
    if (!student) throw new ForbiddenException('ط§ظ„ط·ط§ظ„ط¨ ظ„ط§ ظٹطھط¨ط¹ ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ظ…ط±طھط¨ط·ط© ط¨ظ‡ط°ط§ ط§ظ„ط­ط³ط§ط¨');
    if (role === Role.PARENT) {
      const linkedStudent = await this.prisma.parentStudent.findFirst({
        where: { parentId: respondentId, studentId },
        select: { id: true },
      });
      if (!linkedStudent) throw new ForbiddenException('ظٹظ…ظƒظ† ط¥ط±ط³ط§ظ„ ط§ظ„ط§ط³طھط¨ظٹط§ظ† ظ„ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ط±طھط¨ط·ظٹظ† ط¨ط­ط³ط§ط¨ظƒ ظپظ‚ط·');
    }

    return this.prisma.$transaction(async (tx) => {
      const survey = await tx.parentSurvey.upsert({
        where: { respondentId_studentId: { respondentId, studentId } },
        create: {
          respondentId,
          respondentRole: role,
          parentId: role === Role.PARENT ? respondentId : null,
          studentId,
          schoolId: respondent.schoolId,
          answers,
          consentedAt: new Date(),
        },
        update: {
          respondentRole: role,
          parentId: role === Role.PARENT ? respondentId : null,
          schoolId: respondent.schoolId,
          answers,
          consentedAt: new Date(),
          consentVersion: 'parent-survey-v1',
        },
        select: { id: true, studentId: true, respondentRole: true, updatedAt: true, consentedAt: true, consentVersion: true },
      });
      await tx.auditLog.create({
        data: {
          schoolId: respondent.schoolId,
          userId: respondentId,
          action: 'parent_survey.submitted',
          entityType: 'parent_survey',
          entityId: survey.id,
          metadata: { studentId, respondentRole: role },
        },
      });
      return survey;
    });
  }

  async listMyIntakeSurveys(userId: string, userRole: string) {
    const role = String(userRole).toUpperCase();
    if (role !== Role.STUDENT && role !== Role.PARENT) throw new ForbiddenException();
    const where: Prisma.ParentSurveyWhereInput = role === Role.PARENT
      ? { respondentId: userId }
      : { studentId: userId };
    const data = await this.prisma.parentSurvey.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        studentId: true,
        respondentId: true,
        respondentRole: true,
        answers: true,
        respondent: { select: { id: true, name: true, email: true, role: true } },
        consentedAt: true,
        consentVersion: true,
        createdAt: true,
        updatedAt: true,
        student: { select: { id: true, name: true } },
      },
    });
    return { data };
  }

  async listParentSurveys(schoolId: string, actorId: string, page = 1, limit = 25) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const where = { schoolId: scopedSchoolId };
    const [data, total] = await Promise.all([
      this.prisma.parentSurvey.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          parent: { select: { id: true, name: true, email: true } },
          respondent: { select: { id: true, name: true, email: true, role: true } },
          student: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.parentSurvey.count({ where }),
    ]);
    await this.prisma.auditLog.create({
      data: {
        schoolId: scopedSchoolId,
        userId: actorId,
        action: 'parent_survey.report_viewed',
        entityType: 'parent_survey_report',
        metadata: { page: safePage, returned: data.length },
      },
    });
    return { data, meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) } };
  }
}
