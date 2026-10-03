import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface AssignmentTemplate {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  type: 'MCQ' | 'ESSAY' | 'PROJECT' | 'HOMEWORK' | 'QUIZ' | 'LAB';
  category: 'MATH' | 'SCIENCE' | 'ARABIC' | 'ENGLISH' | 'SOCIAL' | 'GENERAL';
  estimatedDuration: number; // minutes
  defaultPoints: number;
  instructions: string;
  instructionsAr: string;
  questions?: TemplateQuestion[];
  rubric?: RubricCriteria[];
  tags: string[];
  createdBy?: string;
  isPublic: boolean;
}

export interface TemplateQuestion {
  text: string;
  textAr: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  options?: string[];
  optionsAr?: string[];
  correctAnswer?: string;
  points: number;
}

export interface RubricCriteria {
  criterion: string;
  criterionAr: string;
  levels: {
    level: string;
    levelAr: string;
    points: number;
    description: string;
    descriptionAr: string;
  }[];
}

@Injectable()
export class AssignmentTemplateService {
  constructor(private prisma: PrismaService) {}

  private readonly builtInTemplates: AssignmentTemplate[] = [
    {
      id: 'template-math-quiz',
      title: 'Math Quick Quiz',
      titleAr: 'اختبار رياضيات سريع',
      description: 'Short quiz for testing basic math concepts',
      descriptionAr: 'اختبار قصير لتقييم المفاهيم الرياضية الأساسية',
      type: 'QUIZ',
      category: 'MATH',
      estimatedDuration: 15,
      defaultPoints: 20,
      instructions: 'Answer all questions. Show your work for full credit.',
      instructionsAr:
        'أجب على جميع الأسئلة. أظهر خطوات الحل للحصول على الدرجة الكاملة.',
      questions: [
        {
          text: 'What is 15 + 27?',
          textAr: 'ما ناتج 15 + 27؟',
          type: 'MCQ',
          options: ['42', '41', '43', '40'],
          optionsAr: ['42', '41', '43', '40'],
          correctAnswer: '42',
          points: 5,
        },
        {
          text: 'Is 17 a prime number?',
          textAr: 'هل 17 عدد أولي؟',
          type: 'TRUE_FALSE',
          options: ['True', 'False'],
          optionsAr: ['صحيح', 'خطأ'],
          correctAnswer: 'True',
          points: 5,
        },
      ],
      tags: ['math', 'quick', 'grade-6'],
      isPublic: true,
    },
    {
      id: 'template-essay-arabic',
      title: 'Arabic Essay',
      titleAr: 'موضوع تعبير',
      description: 'Essay assignment for Arabic language',
      descriptionAr: 'واجب كتابة موضوع تعبير باللغة العربية',
      type: 'ESSAY',
      category: 'ARABIC',
      estimatedDuration: 45,
      defaultPoints: 50,
      instructions: 'Write a well-structured essay (300-500 words)',
      instructionsAr: 'اكتب موضوع تعبير منظم (300-500 كلمة)',
      rubric: [
        {
          criterion: 'Content Quality',
          criterionAr: 'جودة المحتوى',
          levels: [
            {
              level: 'Excellent',
              levelAr: 'ممتاز',
              points: 20,
              description: 'Rich content, clear ideas',
              descriptionAr: 'محتوى غني وأفكار واضحة',
            },
            {
              level: 'Good',
              levelAr: 'جيد',
              points: 15,
              description: 'Good content, some clarity',
              descriptionAr: 'محتوى جيد مع بعض الوضوح',
            },
            {
              level: 'Fair',
              levelAr: 'مقبول',
              points: 10,
              description: 'Basic content',
              descriptionAr: 'محتوى أساسي',
            },
          ],
        },
        {
          criterion: 'Grammar & Spelling',
          criterionAr: 'النحو والإملاء',
          levels: [
            {
              level: 'Excellent',
              levelAr: 'ممتاز',
              points: 15,
              description: 'No errors',
              descriptionAr: 'بدون أخطاء',
            },
            {
              level: 'Good',
              levelAr: 'جيد',
              points: 10,
              description: 'Few errors',
              descriptionAr: 'أخطاء قليلة',
            },
            {
              level: 'Fair',
              levelAr: 'مقبول',
              points: 5,
              description: 'Several errors',
              descriptionAr: 'عدة أخطاء',
            },
          ],
        },
      ],
      tags: ['arabic', 'writing', 'essay'],
      isPublic: true,
    },
    {
      id: 'template-science-lab',
      title: 'Science Lab Report',
      titleAr: 'تقرير مختبر علوم',
      description: 'Template for science experiment reports',
      descriptionAr: 'قالب لتقارير التجارب العلمية',
      type: 'LAB',
      category: 'SCIENCE',
      estimatedDuration: 90,
      defaultPoints: 100,
      instructions: 'Follow the scientific method. Include all sections.',
      instructionsAr: 'اتبع الطريقة العلمية. قم بتضمين جميع الأقسام.',
      rubric: [
        {
          criterion: 'Hypothesis',
          criterionAr: 'الفرضية',
          levels: [
            {
              level: 'Clear',
              levelAr: 'واضحة',
              points: 15,
              description: 'Well-defined hypothesis',
              descriptionAr: 'فرضية محددة بوضوح',
            },
            {
              level: 'Partial',
              levelAr: 'جزئية',
              points: 10,
              description: 'Somewhat clear',
              descriptionAr: 'واضحة إلى حد ما',
            },
          ],
        },
        {
          criterion: 'Procedure',
          criterionAr: 'الإجراءات',
          levels: [
            {
              level: 'Detailed',
              levelAr: 'مفصلة',
              points: 25,
              description: 'Step-by-step procedure',
              descriptionAr: 'إجراءات مفصلة خطوة بخطوة',
            },
            {
              level: 'Basic',
              levelAr: 'أساسية',
              points: 15,
              description: 'Basic steps',
              descriptionAr: 'خطوات أساسية',
            },
          ],
        },
        {
          criterion: 'Results & Analysis',
          criterionAr: 'النتائج والتحليل',
          levels: [
            {
              level: 'Comprehensive',
              levelAr: 'شامل',
              points: 30,
              description: 'Detailed analysis',
              descriptionAr: 'تحليل مفصل',
            },
            {
              level: 'Adequate',
              levelAr: 'كافٍ',
              points: 20,
              description: 'Basic analysis',
              descriptionAr: 'تحليل أساسي',
            },
          ],
        },
      ],
      tags: ['science', 'lab', 'experiment'],
      isPublic: true,
    },
    {
      id: 'template-homework-general',
      title: 'General Homework',
      titleAr: 'واجب عام',
      description: 'Generic homework template',
      descriptionAr: 'قالب واجب عام للاستخدام اليومي',
      type: 'HOMEWORK',
      category: 'GENERAL',
      estimatedDuration: 30,
      defaultPoints: 10,
      instructions: 'Complete all assigned problems. Submit before deadline.',
      instructionsAr: 'أكمل جميع المسائل المطلوبة. سلّم قبل الموعد النهائي.',
      tags: ['homework', 'general', 'daily'],
      isPublic: true,
    },
    {
      id: 'template-reading-comprehension',
      title: 'Reading Comprehension',
      titleAr: 'فهم المقروء',
      description: 'Reading passage with questions',
      descriptionAr: 'قطعة قراءة مع أسئلة فهم',
      type: 'QUIZ',
      category: 'ARABIC',
      estimatedDuration: 25,
      defaultPoints: 30,
      instructions: 'Read the passage carefully and answer the questions.',
      instructionsAr: 'اقرأ القطعة بعناية ثم أجب على الأسئلة.',
      questions: [
        {
          text: 'What is the main idea?',
          textAr: 'ما الفكرة الرئيسية؟',
          type: 'SHORT_ANSWER',
          points: 10,
        },
        {
          text: 'Summarize in 2-3 sentences',
          textAr: 'لخّص في 2-3 جمل',
          type: 'SHORT_ANSWER',
          points: 10,
        },
      ],
      tags: ['reading', 'comprehension', 'arabic'],
      isPublic: true,
    },
    {
      id: 'template-project-research',
      title: 'Research Project',
      titleAr: 'مشروع بحثي',
      description: 'Long-term research project template',
      descriptionAr: 'قالب مشروع بحثي طويل الأمد',
      type: 'PROJECT',
      category: 'GENERAL',
      estimatedDuration: 300,
      defaultPoints: 100,
      instructions: 'Choose a topic, research, and present findings.',
      instructionsAr: 'اختر موضوعاً، ابحث، وقدّم النتائج.',
      rubric: [
        {
          criterion: 'Research Quality',
          criterionAr: 'جودة البحث',
          levels: [
            {
              level: 'Excellent',
              levelAr: 'ممتاز',
              points: 40,
              description: 'Multiple reliable sources',
              descriptionAr: 'مصادر موثوقة متعددة',
            },
            {
              level: 'Good',
              levelAr: 'جيد',
              points: 30,
              description: 'Good sources',
              descriptionAr: 'مصادر جيدة',
            },
          ],
        },
        {
          criterion: 'Presentation',
          criterionAr: 'العرض',
          levels: [
            {
              level: 'Professional',
              levelAr: 'احترافي',
              points: 30,
              description: 'Well-organized and clear',
              descriptionAr: 'منظم وواضح',
            },
            {
              level: 'Adequate',
              levelAr: 'كافٍ',
              points: 20,
              description: 'Basic organization',
              descriptionAr: 'تنظيم أساسي',
            },
          ],
        },
      ],
      tags: ['project', 'research', 'long-term'],
      isPublic: true,
    },
  ];

  /**
   * Get all available templates
   */
  getAllTemplates(category?: string): AssignmentTemplate[] {
    let templates = this.builtInTemplates;

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    return templates;
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): AssignmentTemplate {
    const template = this.builtInTemplates.find((item) => item.id === id);
    if (!template) throw new NotFoundException('Assignment template not found');
    return template;
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): AssignmentTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.builtInTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.titleAr.includes(query) ||
        t.tags.some((tag) => tag.includes(lowerQuery)),
    );
  }

  /**
   * Create assignment from template
   */
  async createFromTemplate(
    templateId: string,
    actorId: string,
    classId: string,
    customizations: {
      title?: string;
      dueDate?: Date | string;
      points?: number;
    },
  ) {
    const template = this.getTemplateById(templateId);
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true, schoolId: true, isActive: true },
    });
    if (!actor?.isActive || !actor.schoolId || actor.role !== Role.TEACHER) {
      throw new ForbiddenException('An active school teacher account is required');
    }

    const targetClass = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: actor.schoolId },
      select: {
        id: true,
        subjects: {
          where: { schoolId: actor.schoolId, teacherId: actor.id },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!targetClass) throw new NotFoundException('Class not found');
    const subject = targetClass.subjects[0];
    if (!subject) throw new ForbiddenException('You are not assigned to teach a subject in this class');

    if (customizations.points !== undefined &&
        (!Number.isFinite(customizations.points) || customizations.points <= 0)) {
      throw new BadRequestException('Assignment points must be a positive number');
    }
    const dueDate = customizations.dueDate === undefined
      ? undefined
      : new Date(customizations.dueDate);
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException('Due date is invalid');
    }

    return this.prisma.assignment.create({
      data: {
        title: customizations.title?.trim() || template.titleAr,
        description: template.descriptionAr,
        ...(dueDate ? { dueDate } : {}),
        subjectId: subject.id,
        teacherId: actor.id,
        classId: targetClass.id,
        schoolId: actor.schoolId,
        maxScore: customizations.points ?? template.defaultPoints,
      },
    });
  }

  /**
   * Get template statistics
   */
  getTemplateStats(): {
    totalTemplates: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};

    this.builtInTemplates.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byType[t.type] = (byType[t.type] || 0) + 1;
    });

    return {
      totalTemplates: this.builtInTemplates.length,
      byCategory,
      byType,
    };
  }
}
