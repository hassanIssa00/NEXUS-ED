import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type OpenAI from 'openai';
import { createAiProvider, createOpenAiImageClient, type AiProvider } from './ai-provider';
import { withNexusContext } from './nexus-platform-context';

export interface GeneratedContent {
  summary: string;
  keyConcepts: string[];
  quiz: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
  flashcards: {
    front: string;
    back: string;
  }[];
  homework: string[];
}

import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiContentService {
  private readonly ai: AiProvider | null;
  private readonly openaiImages: OpenAI | null;
  private readonly logger = new Logger(AiContentService.name);

  constructor(private configService: ConfigService) {
    this.ai = createAiProvider(this.configService);
    this.openaiImages = createOpenAiImageClient(this.configService);
  }

  /**
   * Generates interactive content from raw text
   */
  async processContent(text: string): Promise<GeneratedContent> {
    if (!this.ai) {
      throw new ServiceUnavailableException('توليد المحتوى غير متاح؛ لم يتم إعداد مزود الذكاء الاصطناعي.');
    }

    const systemPrompt = withNexusContext(`أنت مساعد ذكي للمعلمين. مهمتك تحويل النص التعليمي المدخل إلى محتوى تفاعلي متكامل.
أخرج النتيجة بصيغة JSON حصراً بهذا الهيكل:
{
  "summary": "ملخص شامل ومبسط للنص في 3-4 أسطر",
  "keyConcepts": ["مفهوم 1", "مفهوم 2", "مفهوم 3"],
  "quiz": [
    {
      "question": "نص السؤال 1",
      "options": ["خيار أ", "خيار ب", "خيار ج", "خيار د"],
      "correctAnswer": 0, // رقم الخيار الصحيح (0-3)
      "explanation": "شرح مبسط لسبب كون الإجابة صحيحة"
    }
  ],
  "flashcards": [
    { "front": "المصطلح أو السؤال", "back": "التعريف أو الإجابة" }
  ],
  "homework": [
    "مهمة بحثية أو تطبيقية 1",
    "سؤال مقالي للتفكير العميق 2"
  ]
}

تأكد أن يحتوي الـ quiz على 5 أسئلة، والـ flashcards على 5 بطاقات على الأقل.`);

    try {
      const completion = await this.ai.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `النص التعليمي:\n${text}` }
        ],
        model: this.ai.model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      let result: any = {};
      try {
        result = JSON.parse(completion.choices[0].message.content || '{}');
      } catch (parseErr) {
        this.logger.error(`Failed to parse ${this.ai.name} JSON for content generation`, parseErr);
        throw new Error('فشل تحليل استجابة الذكاء الاصطناعي');
      }

      // Validate and sanitize all required fields
      return {
        summary: typeof result.summary === 'string' ? result.summary : 'لم يتم إنشاء ملخص.',
        keyConcepts: Array.isArray(result.keyConcepts) ? result.keyConcepts.filter((v: any) => typeof v === 'string') : [],
        quiz: Array.isArray(result.quiz) ? result.quiz.filter((q: any) =>
          q && typeof q.question === 'string' && Array.isArray(q.options) && typeof q.correctAnswer === 'number'
        ) : [],
        flashcards: Array.isArray(result.flashcards) ? result.flashcards.filter((f: any) =>
          f && typeof f.front === 'string' && typeof f.back === 'string'
        ) : [],
        homework: Array.isArray(result.homework) ? result.homework.filter((h: any) => typeof h === 'string') : [],
      };
    } catch (error: any) {
      this.logger.error('Failed to generate interactive content: ' + error.message, error);
      throw new ServiceUnavailableException('تعذر توليد المحتوى الآن.');
    }
  }

  /**
   * Generates an educational image from a prompt
   */
  async generateImage(prompt: string): Promise<string> {
    if (!this.openaiImages) {
      throw new ServiceUnavailableException('توليد الصور يحتاج إعداد OPENAI_API_KEY؛ مفتاح Groq يدعم النص والصور المدخلة للتحليل ولا ينشئ صورًا.');
    }

    try {
      const response = await this.openaiImages.images.generate({
        model: "dall-e-3",
        prompt: `Create an educational, child-friendly, colorful illustration for students based on this concept: ${prompt}. The image should be illustrative, flat vector style, and easy to understand for young learners. Do not include any text in the image.`,
        n: 1,
        size: "1024x1024",
      });

      return response.data?.[0]?.url || '';
    } catch (error: any) {
      this.logger.error('Failed to generate image: ' + error.message, error);
      throw new ServiceUnavailableException('تعذر توليد الصورة الآن.');
    }
  }


}
