import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';

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
  private openai: OpenAI | null = null;
  private readonly logger = new Logger(AiContentService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'sk_placeholder') {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generates interactive content from raw text
   */
  async processContent(text: string): Promise<GeneratedContent> {
    if (!this.openai) {
      throw new ServiceUnavailableException('توليد المحتوى غير متاح؛ لم يتم إعداد مزود الذكاء الاصطناعي.');
    }

    const systemPrompt = `أنت مساعد ذكي للمعلمين. مهمتك تحويل النص التعليمي المدخل إلى محتوى تفاعلي متكامل.
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

تأكد أن يحتوي الـ quiz على 5 أسئلة، والـ flashcards على 5 بطاقات على الأقل.`;

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `النص التعليمي:\n${text}` }
        ],
        model: 'gpt-4o',
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      let result: any = {};
      try {
        result = JSON.parse(completion.choices[0].message.content || '{}');
      } catch (parseErr) {
        this.logger.error('Failed to parse OpenAI JSON for content generation', parseErr);
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
    if (!this.openai) {
      throw new ServiceUnavailableException('توليد الصور غير متاح؛ لم يتم إعداد مزود الذكاء الاصطناعي.');
    }

    try {
      const response = await this.openai.images.generate({
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
