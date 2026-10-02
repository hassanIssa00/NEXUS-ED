import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AiContentGeneratorService {
  constructor(private prisma: PrismaService) {}

  async getMyTemplates(teacherId: string) {
    return this.prisma.generatedTemplate.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveTemplate(teacherId: string, data: any) {
    return this.prisma.generatedTemplate.create({
      data: {
        teacherId,
        title: data.title,
        content: data.content,
        type: data.type || 'LESSON_PLAN',
      }
    });
  }

  async deleteTemplate(teacherId: string, id: string) {
    const template = await this.prisma.generatedTemplate.findUnique({ where: { id } });
    if (!template || template.teacherId !== teacherId) {
      throw new NotFoundException('Template not found');
    }
    return this.prisma.generatedTemplate.delete({ where: { id } });
  }

  async getQuestionBanks(teacherId: string, subjectId?: string) {
    const where = {
      ...(subjectId ? { subjectId } : {}),
      subject: { OR: [{ teacherId }, { classSubjects: { some: { teacherId } } }] },
    };
    return this.prisma.questionBank.findMany({
      where,
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveQuestionBank(teacherId: string, subjectId: string, topic: string, questions: any[]) {
    if (!Array.isArray(questions) || questions.length === 0 || !topic.trim()) {
      throw new NotFoundException('A topic and at least one question are required');
    }
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        OR: [{ teacherId }, { classSubjects: { some: { teacherId } } }],
      },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    return this.prisma.questionBank.create({
      data: {
        subjectId,
        topic,
        questions,
      }
    });
  }
}
