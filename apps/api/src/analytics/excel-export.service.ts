import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as ExcelJS from 'exceljs';

export interface ExcelExportOptions {
  fileName: string;
  sheetName: string;
  headers: string[];
  data: any[][];
  rtl?: boolean;
}

@Injectable()
export class ExcelExportService {
  constructor(private prisma: PrismaService) { }

  private attendanceLabel(status: string): string {
    return ({ PRESENT: 'حاضر', ABSENT: 'غائب', LATE: 'متأخر', EXCUSED: 'بعذر' } as Record<string, string>)[status] || status;
  }

  /**
   * Create basic Excel file with data
   */
  async createExcel(options: ExcelExportOptions): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(options.sheetName, {
      properties: { tabColor: { argb: '667eea' } },
      views: [{ rightToLeft: options.rtl ?? true }],
    });

    // Add headers with styling
    const headerRow = worksheet.addRow(options.headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '667eea' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    // Add data rows
    options.data.forEach((row) => {
      const dataRow = worksheet.addRow(row);
      dataRow.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Auto-fit columns
    // worksheet.columns.forEach((column) => {
    //   let maxLength = 0;
    //   if (column && column.eachCell) {
    //     column.eachCell({ includeEmpty: true }, (cell) => {
    //       const columnLength = cell.value ? String(cell.value).length : 10;
    //       if (columnLength > maxLength) {
    //         maxLength = columnLength;
    //       }
    //     });
    //     column.width = Math.min(maxLength + 5, 50);
    //   }
    // });

    // Add borders
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Export recorded student grades
   */
  async exportStudentGrades(studentId: string): Promise<any> {
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId,
        maxScore: { gt: 0 },
      },
      include: { subject: true, assignment: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'المادة',
      'التقييم',
      'الدرجة',
      'الدرجة العظمى',
      'النسبة المئوية',
      'التاريخ',
    ];
    const data = grades.map((grade) => [
      grade.subject?.name || '—',
      grade.assignment?.title || 'تقييم مسجل',
      Number(grade.grade),
      Number(grade.maxScore),
      `${Math.round((Number(grade.grade) / Number(grade.maxScore)) * 100)}%`,
      new Date(grade.createdAt).toLocaleDateString('ar-EG'),
    ]);

    return this.createExcel({
      fileName: 'student_grades.xlsx',
      sheetName: 'الدرجات',
      headers,
      data,
      rtl: true,
    });
  }

  /**
   * Export class attendance report
   */
  async exportClassAttendance(
    classId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        classId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: true,
      },
      orderBy: [{ date: 'asc' }, { student: { name: 'asc' } }],
    });

    const headers = ['اسم الطالب', 'التاريخ', 'الحالة', 'ملاحظات'];
    const data = attendanceRecords.map((record) => [
      record.student.name || record.student.firstName || '',
      new Date(record.date).toLocaleDateString('ar-EG'),
      this.attendanceLabel(record.status),
      record.notes || '-',
    ]);

    return this.createExcel({
      fileName: 'class_attendance.xlsx',
      sheetName: 'الحضور والغياب',
      headers,
      data,
      rtl: true,
    });
  }

  /**
   * Export comprehensive student report
   */
  async exportStudentReport(studentId: string): Promise<any> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Student Info
    const infoSheet = workbook.addWorksheet('معلومات الطالب', {
      views: [{ rightToLeft: true }],
    });

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: { class: true },
        },
      },
    });

    if (student) {
      infoSheet.addRow(['الاسم', student.name || student.firstName || '']);
      infoSheet.addRow(['البريد الإلكتروني', student.email]);
      infoSheet.addRow(['الفصول', student.enrollments.map((item) => item.class.name).join('، ') || '—']);
      infoSheet.addRow([
        'تاريخ التسجيل',
        new Date(student.createdAt).toLocaleDateString('ar-EG'),
      ]);
    }

    // Sheet 2: Grades from the same grade records used by student reports.
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId,
        maxScore: { gt: 0 },
      },
      include: { subject: true, assignment: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const gradesSheet = workbook.addWorksheet('الدرجات', {
      views: [{ rightToLeft: true }],
    });

    const gradeHeaders = gradesSheet.addRow([
      'المادة',
      'التقييم',
      'الدرجة',
      'النسبة المئوية',
      'التاريخ',
    ]);
    gradeHeaders.font = { bold: true };
    gradeHeaders.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '667eea' },
    };

    grades.forEach((grade) => {
      gradesSheet.addRow([
        grade.subject?.name || '—',
        grade.assignment?.title || 'تقييم مسجل',
        `${Number(grade.grade)}/${Number(grade.maxScore)}`,
        `${Math.round((Number(grade.grade) / Number(grade.maxScore)) * 100)}%`,
        new Date(grade.createdAt).toLocaleDateString('ar-EG'),
      ]);
    });

    // Sheet 3: Attendance
    const attendance = await this.prisma.attendance.findMany({
      where: { studentId },
      include: { class: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const attendanceSheet = workbook.addWorksheet('الحضور', {
      views: [{ rightToLeft: true }],
    });

    const attendanceHeaders = attendanceSheet.addRow([
      'التاريخ',
      'الفصل',
      'الحالة',
      'ملاحظات',
    ]);
    attendanceHeaders.font = { bold: true };
    attendanceHeaders.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '10b981' },
    };

    attendance.forEach((record) => {
      attendanceSheet.addRow([
        new Date(record.date).toLocaleDateString('ar-EG'),
        record.class.name,
        this.attendanceLabel(record.status),
        record.notes || '-',
      ]);
    });

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Export all students grades for a subject
   */
  async exportSubjectGrades(subjectId: string): Promise<any> {
    const grades = await this.prisma.grade.findMany({
      where: {
        subjectId,
        maxScore: { gt: 0 },
      },
      include: {
        student: true,
        assignment: { select: { title: true } },
      },
      orderBy: [{ student: { name: 'asc' } }, { createdAt: 'desc' }],
    });

    const headers = [
      'اسم الطالب',
      'التقييم',
      'الدرجة',
      'الدرجة العظمى',
      'النسبة المئوية',
      'التاريخ',
    ];
    const data = grades.map((grade) => [
      grade.student.name || grade.student.firstName || '',
      grade.assignment?.title || 'تقييم مسجل',
      Number(grade.grade),
      Number(grade.maxScore),
      `${Math.round((Number(grade.grade) / Number(grade.maxScore)) * 100)}%`,
      new Date(grade.createdAt).toLocaleDateString('ar-EG'),
    ]);

    return this.createExcel({
      fileName: 'subject_grades.xlsx',
      sheetName: 'درجات المادة',
      headers,
      data,
      rtl: true,
    });
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(studentId: string): Promise<any> {
    const headers = [
      'المادة',
      'المعدل',
      'أعلى درجة',
      'أقل درجة',
      'عدد التقييمات',
    ];

    const grades = await this.prisma.grade.findMany({
      where: { studentId, maxScore: { gt: 0 } },
      include: { subject: true },
      orderBy: { createdAt: 'desc' },
    });
    const bySubject = new Map<string, { name: string; percentages: number[] }>();
    grades.forEach((grade) => {
      const score = Number(grade.grade);
      const maxScore = Number(grade.maxScore);
      if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return;
      const bucket = bySubject.get(grade.subjectId) || { name: grade.subject.name, percentages: [] };
      bucket.percentages.push((score / maxScore) * 100);
      bySubject.set(grade.subjectId, bucket);
    });
    const data = Array.from(bySubject.values()).map(({ name, percentages }) => [
      name,
      Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length),
      Math.round(Math.max(...percentages)),
      Math.round(Math.min(...percentages)),
      percentages.length,
    ]);

    return this.createExcel({
      fileName: 'student_analytics.xlsx',
      sheetName: 'التحليلات',
      headers,
      data: data as any[][],
      rtl: true,
    });
  }
}
