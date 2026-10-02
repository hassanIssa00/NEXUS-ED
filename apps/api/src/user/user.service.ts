import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/role.enum';
import { createHash, randomBytes } from 'crypto';

const PARENT_SURVEY_OPTIONS: Record<string, readonly string[]> = {
  q1: ['أقل من 6 سنوات', '6 إلى 10 سنوات', '11 إلى 15 سنة', 'أكثر من 15 سنة'],
  q2: ['لا توجد', 'حساسية طعام', 'حالة صحية تحتاج متابعة'],
  q3: ['9 إلى 10 ساعات', '7 إلى 8 ساعات', 'أقل من 7 ساعات'],
  q4: ['أقل من ساعة', 'ساعة إلى ساعتين', 'أكثر من ساعتين'],
  q5: ['بطلاقة', 'يحتاج إلى تشجيع', 'يواجه صعوبة أحياناً'],
  q6: ['اهتمام كبير', 'اهتمام متوسط', 'يفضل أنشطة أخرى'],
  q7: ['لا توجد', 'أحياناً', 'توجد صعوبة ملحوظة'],
  q8: ['يندمج بسهولة', 'يحتاج وقتاً للاندماج', 'يفضل الأنشطة الفردية'],
  q9: ['بمرونة غالباً', 'يحتاج إلى تذكير', 'يحتاج إلى متابعة إضافية'],
  q10: ['بهدوء', 'يحتاج تذكيراً بسيطاً', 'يجد صعوبة في الانتظار'],
  q11: ['يركز باستمرار', 'يتشتت أحياناً', 'يحتاج فواصل حركة'],
  q12: ['يحاول مرة أخرى', 'يطلب المساعدة', 'ينزعج ويحتاج تشجيعاً'],
  q13: ['ملتزم غالباً', 'يحتاج تذكيراً', 'يحتاج متابعة مستمرة'],
  q14: ['الأب والأم معاً', 'الأم غالباً', 'الأب غالباً', 'شخص آخر'],
  q15: ['التحصيل الدراسي', 'بناء الشخصية والثقة', 'تنمية المهارات الأساسية', 'جميع ما سبق'],
};

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

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
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId: scopedSchoolId },
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
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
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
          isActive: true,
          createdAt: true,
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: staff,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: CreateUserDto, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        ...data,
        schoolId: scopedSchoolId,
        name: data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.email.split('@')[0]),
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: UpdateUserDto, schoolId?: string) {
    const scopedSchoolId = this.requireSchool(schoolId);
    const existing = await this.prisma.user.findFirst({ where: { id, schoolId: scopedSchoolId }, select: { id: true } });
    if (!existing) throw new NotFoundException('User not found');
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
    const [total, students, teachers, parents, admins] = await Promise.all([
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'TEACHER', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'PARENT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId: scopedSchoolId, role: 'ADMIN', isActive: true } }),
    ]);

    return {
      total,
      students,
      teachers,
      parents,
      admins,
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

  async saveStudentProfile(userId: string, gradeLevel: number, dateOfBirth?: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.STUDENT, isActive: true },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student account not found');

    if (!dateOfBirth) {
      return this.prisma.studentProfile.upsert({
        where: { userId },
        create: { userId, gradeLevel },
        update: { gradeLevel },
      });
    }

    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
      throw new BadRequestException('Date of birth must be a valid date in the past');
    }
    return this.prisma.studentProfile.upsert({
      where: { userId },
      create: { userId, gradeLevel, dateOfBirth: birthDate },
      update: { gradeLevel, dateOfBirth: birthDate },
    });
  }

  async createStudentLinkCode(studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: Role.STUDENT, isActive: true, schoolId: { not: null } },
      select: { id: true, schoolId: true },
    });
    if (!student?.schoolId) throw new ForbiddenException('Student account is not assigned to an active school');

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

  async redeemStudentLinkCode(parentId: string, rawCode: string) {
    const codeHash = createHash('sha256').update(rawCode.trim().toUpperCase()).digest('hex');
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.user.findFirst({
        where: { id: parentId, role: Role.PARENT, isActive: true, schoolId: { not: null } },
        select: { id: true, schoolId: true },
      });
      if (!parent?.schoolId) throw new ForbiddenException('Parent account is not assigned to an active school');

      const linkCode = await tx.studentLinkCode.findFirst({
        where: { tokenHash: codeHash, redeemedAt: null, expiresAt: { gt: now } },
        include: { student: { select: { id: true, name: true, email: true, role: true, schoolId: true, isActive: true } } },
      });
      if (!linkCode || !linkCode.student.isActive || linkCode.student.role !== Role.STUDENT) {
        throw new BadRequestException('رمز الربط غير صالح أو منتهي الصلاحية');
      }
      if (linkCode.student.schoolId !== parent.schoolId) {
        throw new ForbiddenException('رمز الربط لا يخص حساباً في مدرستك');
      }

      const existingLink = await tx.parentStudent.findUnique({
        where: { parentId_studentId: { parentId, studentId: linkCode.student.id } },
        select: { id: true },
      });
      if (existingLink) throw new ConflictException('هذا الطالب مرتبط بحسابك بالفعل');

      const claimed = await tx.studentLinkCode.updateMany({
        where: { id: linkCode.id, redeemedAt: null, expiresAt: { gt: now } },
        data: { redeemedAt: now, redeemedById: parentId },
      });
      if (claimed.count !== 1) throw new ConflictException('رمز الربط استُخدم بالفعل');

      await tx.parentStudent.create({ data: { parentId, studentId: linkCode.student.id } });
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

  async submitParentSurvey(parentId: string, studentId: string, answers: Record<string, string>, consent: boolean) {
    if (consent !== true) throw new BadRequestException('يلزم الموافقة على استخدام بيانات الاستبيان');
    const keys = Object.keys(answers ?? {});
    if (keys.length !== Object.keys(PARENT_SURVEY_OPTIONS).length || keys.some((key) => !PARENT_SURVEY_OPTIONS[key])) {
      throw new BadRequestException('يرجى الإجابة عن جميع أسئلة الاستبيان');
    }
    for (const [questionId, answer] of Object.entries(answers)) {
      if (typeof answer !== 'string' || !PARENT_SURVEY_OPTIONS[questionId].includes(answer)) {
        throw new BadRequestException('تحتوي الإجابات على قيمة غير صالحة');
      }
    }

    const parent = await this.prisma.user.findFirst({
      where: { id: parentId, role: Role.PARENT, isActive: true, schoolId: { not: null } },
      select: { id: true, schoolId: true },
    });
    if (!parent?.schoolId) throw new ForbiddenException('يمكن إرسال الاستبيان للطلاب المرتبطين بحسابك فقط');
    const linkedStudent = await this.prisma.parentStudent.findFirst({
      where: {
        parentId,
        studentId,
        student: { role: Role.STUDENT, isActive: true, schoolId: parent.schoolId },
      },
      select: { id: true },
    });
    if (!linkedStudent) throw new ForbiddenException('يمكن إرسال الاستبيان للطلاب المرتبطين بحسابك فقط');

    return this.prisma.$transaction(async (tx) => {
      const survey = await tx.parentSurvey.upsert({
        where: { parentId_studentId: { parentId, studentId } },
        create: { parentId, studentId, schoolId: parent.schoolId!, answers, consentedAt: new Date() },
        update: { schoolId: parent.schoolId, answers, consentedAt: new Date(), consentVersion: 'parent-survey-v1' },
        select: { id: true, studentId: true, updatedAt: true, consentedAt: true, consentVersion: true },
      });
      await tx.auditLog.create({
        data: {
          schoolId: parent.schoolId!,
          userId: parentId,
          action: 'parent_survey.submitted',
          entityType: 'parent_survey',
          entityId: survey.id,
          metadata: { studentId },
        },
      });
      return survey;
    });
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
