import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface WeaknessTopic {
  topic: string;
  score: number;
  description: string;
}

export interface WeaknessMapResult {
  topics: WeaknessTopic[];
  recommendations: string[];
  learningPath: string;
}

@Injectable()
export class AiPersonalTutorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds a personalized weakness map based on student's past performance
   */
  async buildWeaknessMap(studentId: string): Promise<WeaknessMapResult> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentGrades: {
          include: {
            subject: true,
          },
          take: 30,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student || student.role !== 'STUDENT') throw new NotFoundException('Student not found');

    const subjectTotals = new Map<string, { score: number; maxScore: number; count: number }>();
    for (const grade of student.studentGrades) {
      const maxScore = grade.maxScore || 100;
      if (!Number.isFinite(grade.score) || maxScore <= 0) continue;
      const subject = grade.subject?.name || 'مادة غير محددة';
      const current = subjectTotals.get(subject) ?? { score: 0, maxScore: 0, count: 0 };
      current.score += grade.score;
      current.maxScore += maxScore;
      current.count += 1;
      subjectTotals.set(subject, current);
    }

    const subjects = Array.from(subjectTotals.entries()).map(([topic, result]) => {
      const percentage = Math.round((result.score / result.maxScore) * 100);
      return { topic, percentage, count: result.count };
    });
    const topics = subjects.filter((subject) => subject.percentage < 70).map((subject) => ({
      topic: subject.topic,
      score: Math.max(0, 100 - subject.percentage),
      description: `متوسط الدرجات المسجلة: ${subject.percentage}% من ${subject.count} تقييمًا.`,
    }));

    if (!subjects.length) {
      return { topics: [], recommendations: [], learningPath: 'لا توجد درجات مسجلة كافية لبناء خريطة تحسين.' };
    }
    if (!topics.length) {
      return { topics: [], recommendations: [], learningPath: 'لا تظهر درجات أقل من 70% في البيانات المسجلة المتاحة.' };
    }

    const focusSubjects = topics.map(({ topic }) => topic);
    return {
      topics,
      recommendations: ['راجع تفاصيل التقييمات المسجلة لهذه المواد وناقش ملاحظات المعلم مع المدرسة.'],
      learningPath: `ابدأ بمتابعة نتائج مادة ${focusSubjects.join('، ')}؛ الخريطة مبنية على متوسط الدرجات المسجلة فقط ولا تحدد مهارة فرعية غير موجودة في النظام.`,
    };
  }
}
