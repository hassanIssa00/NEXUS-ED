import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface StudentInsight {
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  encouragementMessage: string;
}

@Injectable()
export class AiAnalyticsService {
  private openai: OpenAI | null = null;
  private readonly logger = new Logger(AiAnalyticsService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'sk_placeholder') {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI Service initialized for Analytics');
    }
  }

  async generateStudentInsights(studentData: any): Promise<StudentInsight> {
    if (!studentData.grades?.length && studentData.attendanceRate === null && !studentData.ungradedSubmissions) {
      return {
        strengths: [],
        weaknesses: [],
        recommendedTopics: [],
        encouragementMessage: 'لا توجد درجات أو سجلات حضور كافية لإعداد تحليل حتى الآن.',
      };
    }
    if (!this.openai) {
      throw new ServiceUnavailableException('خدمة التحليل الذكي غير متاحة؛ لم يتم إعداد مزود الذكاء الاصطناعي.');
    }

    try {
      const systemPrompt = `You are an expert Arabic educational counselor.
      Analyze the following student performance data and provide actionable insights.
      
      Grades: ${JSON.stringify(studentData.grades)}
      Submissions Awaiting a Grade: ${studentData.ungradedSubmissions ?? 'غير متاح'}
      Attendance Rate: ${studentData.attendanceRate === null ? 'غير متاح' : `${studentData.attendanceRate}%`}

      لا تعتبر التسليمات التي تنتظر التصحيح واجبات غير مسلمة. لا تستنتج بيانات غير موجودة، واذكر نقص البيانات في النتيجة.

      Respond ONLY with a valid JSON object matching this structure (in Arabic):
      {
        "strengths": ["string", "string"],
        "weaknesses": ["string", "string"],
        "recommendedTopics": ["string", "string"],
        "encouragementMessage": "A short, positive message to the student"
      }`;

      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }],
        model: 'gpt-4o',
        temperature: 0.6,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error('Empty AI response');
      const parsed = JSON.parse(responseContent);
      if (!Array.isArray(parsed.strengths) || !Array.isArray(parsed.weaknesses) ||
          !Array.isArray(parsed.recommendedTopics) || typeof parsed.encouragementMessage !== 'string' ||
          ![...parsed.strengths, ...parsed.weaknesses, ...parsed.recommendedTopics].every((value) => typeof value === 'string')) {
        throw new Error('AI response did not match the expected schema');
      }
      return parsed as StudentInsight;

    } catch (error) {
      this.logger.error('AI analytics generation failed', error instanceof Error ? error.message : String(error));
      throw new ServiceUnavailableException('تعذر إنشاء التحليل الآن. لم يتم إرجاع نتيجة بديلة غير مبنية على بيانات.');
    }
  }
}
