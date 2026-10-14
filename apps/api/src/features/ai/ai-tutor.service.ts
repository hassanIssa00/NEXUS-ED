import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { GamificationService } from '../../gamification/gamification.service';
import { createAiProvider, type AiProvider } from './ai-provider';
import { withNexusContext } from './nexus-platform-context';

@Injectable()
export class AiTutorService {
  private readonly ai: AiProvider | null;
  private readonly logger = new Logger(AiTutorService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {
    this.ai = createAiProvider(this.configService);
    if (this.ai) this.logger.log(`${this.ai.name} AI tutor initialized`);
    else this.logger.warn('No AI provider configured.');
  }

  async askTutor(
    question: string,
    context?: { subject?: string; grade?: string; studentId?: string },
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<string> {
    if (!this.ai) {
      throw new ServiceUnavailableException('المعلم الذكي غير متاح؛ لم يتم إعداد مزود الذكاء الاصطناعي.');
    }

    try {
      let learningStylePrompt = 'Explain concepts simply and clearly.';
      
      if (context?.studentId) {
        const profile = await this.prisma.smartStudentProfile.findUnique({
          where: { userId: context.studentId }
        });
        
        if (profile?.learningStyle === 'VISUAL') {
          learningStylePrompt = 'Use vivid imagery, visual metaphors, and examples from daily Saudi life to explain concepts. Suggest drawing diagrams where applicable.';
        } else if (profile?.learningStyle === 'LOGICAL') {
          learningStylePrompt = 'Explain step-by-step logically. Break down complex problems into sequence of logical deductions. Avoid fluff.';
        } else if (profile?.learningStyle === 'SOCIAL') {
          learningStylePrompt = 'Use stories, dialogues, and relate concepts to people, society, or historical figures. Make it sound like a friendly conversation.';
        }
      }

      const systemPrompt = withNexusContext(`You are an intelligent, empathetic AI tutor for students in Saudi Arabia.
      Subject: ${context?.subject || 'General'}
      Grade Level: ${context?.grade || 'Unknown'}
      
      Instructions:
      - ${learningStylePrompt}
      - CRITICAL: DO NOT just give the direct answer to homework or test questions. Guide the student to discover the answer themselves.
      - Ask leading questions to help them think.
      - Be encouraging, positive, and supportive.
      - Always answer in Arabic (unless asked otherwise), using a supportive tone (e.g. "بطل", "ممتاز").`);

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: question },
      ];

      const completion = await this.ai.client.chat.completions.create({
        messages,
        model: this.ai.model,
        temperature: 0.7,
      });

      const responseText = completion.choices[0].message.content || 'Sorry, I could not generate a response.';
      
      // Gamification: Reward XP for using AI Tutor (max 5 XP per interaction, maxes out naturally)
      if (context?.studentId) {
        await this.gamification.awardXp(
          context.studentId,
          5,
          'استخدام المعلم الذكي',
        );
      }

      return responseText;
    } catch (error: any) {
      this.logger.error(`${this.ai.name} API Error: ` + error.message, error);
      throw new ServiceUnavailableException('تعذر الاتصال بخدمة المعلم الذكي الآن.');
    }
  }


}
