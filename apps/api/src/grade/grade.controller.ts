import { Controller, Get, Param, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request as ExpressRequest } from 'express';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { GradeService } from './grade.service';

interface RequestWithUser extends ExpressRequest {
  user: {
    id: string;
    userId: string;
    sub?: string;
    email: string;
    role: Role;
  };
}

@Controller('grades')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GradesController {
  constructor(private readonly gradeService: GradeService) {}

  @Get()
  @Roles(Role.STUDENT, Role.TEACHER, Role.PARENT)
  async getGrades(@Request() req: RequestWithUser) {
    const grades = await this.gradeService.findMyGrades(req.user.userId || req.user.sub || req.user.id);
    return this.formatGrades(grades);
  }

  @Get('parent/:studentId')
  @Roles(Role.PARENT)
  async getChildGrades(@Param('studentId') studentId: string, @Request() req: RequestWithUser) {
    const parentId = req.user.userId || req.user.sub || req.user.id;
    const grades = await this.gradeService.findChildGradesForParent(parentId, studentId);
    return this.formatGrades(grades);
  }

  private formatGrades(grades: any[]) {
    const mappedGrades = grades.map(g => {
      const score = Number(g.grade);
      const maxScore = Number(g.maxScore);
      const percentage = Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
        ? (score / maxScore) * 100
        : null;
      let letterGrade = '-';
      if (percentage !== null) {
        letterGrade = 'F';
        if (percentage >= 90) letterGrade = 'A';
        else if (percentage >= 80) letterGrade = 'B';
        else if (percentage >= 70) letterGrade = 'C';
        else if (percentage >= 60) letterGrade = 'D';
      }

      return {
        id: g.id,
        subjectName: g.subject?.name || 'مادة غير معروفة',
        subjectCode: g.subject?.code || '---',
        grade: g.grade,
        maxGrade: g.maxScore,
        percentage: percentage === null ? null : Math.round(percentage),
        letterGrade,
        date: g.createdAt,
      };
    });

    const percentages = grades
      .map(grade => {
        const score = Number(grade.grade);
        const maxScore = Number(grade.maxScore);
        return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
          ? (score / maxScore) * 100
          : null;
      })
      .filter((percentage): percentage is number => percentage !== null);
    const averageGrade = percentages.length
      ? percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length
      : null;

    let averageLetterGrade = '-';
    if (averageGrade !== null) {
      averageLetterGrade = 'F';
      if (averageGrade >= 90) averageLetterGrade = 'A';
      else if (averageGrade >= 80) averageLetterGrade = 'B';
      else if (averageGrade >= 70) averageLetterGrade = 'C';
      else if (averageGrade >= 60) averageLetterGrade = 'D';
    }

    return {
      grades: mappedGrades,
      summary: {
        totalSubjects: grades.length,
        averageGrade,
        letterGrade: averageLetterGrade,
      },
    };
  }

  @Get('report')
  @Roles(Role.STUDENT, Role.TEACHER, Role.PARENT)
  async downloadReport(@Request() req: RequestWithUser, @Res() res: Response) {
    const grades = await this.gradeService.findMyGrades(req.user.userId || req.user.sub || req.user.id);
    
    // The response is a real plain-text export; it is not a PDF document.
    const gradesText = grades.length
      ? grades.map(g => `${g.subject?.name || 'Subject'}: ${g.grade}/${g.maxScore}`).join('\n')
      : 'No grades recorded.';
    const scoredGrades = grades.filter(g =>
      Number.isFinite(Number(g.grade)) && Number.isFinite(Number(g.maxScore)) && Number(g.maxScore) > 0,
    );
    const average = scoredGrades.length
      ? scoredGrades.reduce((sum, g) => sum + (Number(g.grade) / Number(g.maxScore)) * 100, 0) / scoredGrades.length
      : null;

    const reportContent = `
Grade Report
========================
Student: ${req.user.email}
Generated: ${new Date().toLocaleDateString()}

${gradesText}

Overall Average: ${average === null ? 'Not available' : `${average.toFixed(2)}%`}
========================
    `.trim();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=grade-report.txt',
    );

    res.send(Buffer.from(reportContent));
  }
}
