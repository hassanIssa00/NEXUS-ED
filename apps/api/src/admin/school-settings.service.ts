import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface SchoolSettings {
  // نظام الدرجات
  gradingSystem: {
    maxScore: number;
    passingScore: number;
    gradeScale: GradeScale[];
  };

  // الحصص
  periodsConfig: {
    periodsPerDay: number;
    periodDuration: number; // بالدقائق
    breakDuration: number;
    startTime: string; // HH:mm
  };

  // سياسة الغياب
  attendancePolicy: {
    maxAbsenceDays: number;
    lateThreshold: number; // بالدقائق
    parentNotification: boolean;
    warningThreshold: number; // نسبة الغياب للتحذير
  };

  // شكل التقارير
  reportSettings: {
    schoolName: string;
    schoolLogo?: string;
    headerText: string;
    footerText: string;
    showRank: boolean;
    showAttendance: boolean;
    showBehavior: boolean;
    language: 'ar' | 'en';
  };
}

export interface GradeScale {
  min: number;
  max: number;
  grade: string;
  gradeAr: string;
  points: number;
}

const DEFAULT_SETTINGS: SchoolSettings = {
  gradingSystem: {
    maxScore: 100,
    passingScore: 50,
    gradeScale: [
      { min: 90, max: 100, grade: 'A+', gradeAr: 'ممتاز', points: 4.0 },
      { min: 85, max: 89, grade: 'A', gradeAr: 'ممتاز مرتفع', points: 3.7 },
      { min: 80, max: 84, grade: 'B+', gradeAr: 'جيد جداً', points: 3.3 },
      { min: 75, max: 79, grade: 'B', gradeAr: 'جيد جداً مرتفع', points: 3.0 },
      { min: 70, max: 74, grade: 'C+', gradeAr: 'جيد', points: 2.7 },
      { min: 65, max: 69, grade: 'C', gradeAr: 'جيد مرتفع', points: 2.3 },
      { min: 60, max: 64, grade: 'D+', gradeAr: 'مقبول', points: 2.0 },
      { min: 50, max: 59, grade: 'D', gradeAr: 'مقبول مرتفع', points: 1.7 },
      { min: 0, max: 49, grade: 'F', gradeAr: 'راسب', points: 0.0 },
    ],
  },
  periodsConfig: {
    periodsPerDay: 7,
    periodDuration: 45,
    breakDuration: 10,
    startTime: '07:30',
  },
  attendancePolicy: {
    maxAbsenceDays: 15,
    lateThreshold: 15,
    parentNotification: true,
    warningThreshold: 20,
  },
  reportSettings: {
    schoolName: '',
    headerText: 'بسم الله الرحمن الرحيم',
    footerText: 'نتمنى لكم التوفيق والنجاح',
    showRank: true,
    showAttendance: true,
    showBehavior: true,
    language: 'ar',
  },
};

@Injectable()
export class SchoolSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(schoolId: string): Promise<SchoolSettings> {
    if (!schoolId) throw new BadRequestException('The account is not assigned to a school');
    const record = await this.prisma.auditLog.findFirst({
      where: { schoolId, action: 'school.settings.updated', entityType: 'school-settings' },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true },
    });
    return record?.metadata as unknown as SchoolSettings || DEFAULT_SETTINGS;
  }

  async updateSettings(
    updates: Partial<SchoolSettings>,
    schoolId: string,
    userId: string,
  ): Promise<SchoolSettings> {
    const current = await this.getSettings(schoolId);
    const settings: SchoolSettings = {
      ...current,
      ...updates,
      gradingSystem: {
        ...current.gradingSystem,
        ...(updates.gradingSystem || {}),
      },
      periodsConfig: {
        ...current.periodsConfig,
        ...(updates.periodsConfig || {}),
      },
      attendancePolicy: {
        ...current.attendancePolicy,
        ...(updates.attendancePolicy || {}),
      },
      reportSettings: {
        ...current.reportSettings,
        ...(updates.reportSettings || {}),
      },
    };

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'school.settings.updated',
        entityType: 'school-settings',
        entityId: schoolId,
        metadata: settings as unknown as Prisma.InputJsonValue,
      },
    });
    return settings;
  }

  async updateGradingSystem(
    config: Partial<SchoolSettings['gradingSystem']>,
    schoolId: string,
    userId: string,
  ): Promise<SchoolSettings> {
    return this.updateSettings({ gradingSystem: config as SchoolSettings['gradingSystem'] }, schoolId, userId);
  }

  async updatePeriodsConfig(
    config: Partial<SchoolSettings['periodsConfig']>,
    schoolId: string,
    userId: string,
  ): Promise<SchoolSettings> {
    return this.updateSettings({ periodsConfig: config as SchoolSettings['periodsConfig'] }, schoolId, userId);
  }

  async updateAttendancePolicy(
    config: Partial<SchoolSettings['attendancePolicy']>,
    schoolId: string,
    userId: string,
  ): Promise<SchoolSettings> {
    return this.updateSettings({ attendancePolicy: config as SchoolSettings['attendancePolicy'] }, schoolId, userId);
  }

  async updateReportSettings(
    config: Partial<SchoolSettings['reportSettings']>,
    schoolId: string,
    userId: string,
  ): Promise<SchoolSettings> {
    return this.updateSettings({ reportSettings: config as SchoolSettings['reportSettings'] }, schoolId, userId);
  }

}
