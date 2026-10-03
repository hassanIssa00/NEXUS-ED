import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ExamGenerationRequest {
  topic: string;
  subject: string;
  gradeLevel: string;
  questionCount: number;
  questionType: 'multiple_choice' | 'true_false' | 'mixed';
}

export interface GeneratedQuestion {
  question: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

@Injectable()
export class AiExamService {
  private openai: OpenAI | null = null;
  private readonly logger = new Logger(AiExamService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'sk_placeholder') {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI Service initialized for Exam Generation');
    }
  }

  async generateExam(request: ExamGenerationRequest): Promise<GeneratedQuestion[]> {
    if (!this.openai) {
      throw new ServiceUnavailableException('خدمة إنشاء الاختبارات غير متاحة؛ لم يتم إعداد مزود الذكاء الاصطناعي.');
    }

    try {
      const systemPrompt = `You are an expert Arabic educational assistant for teachers.
      Your task is to generate exam questions in Arabic based on the following criteria:
      - Subject: ${request.subject}
      - Grade Level: ${request.gradeLevel}
      - Topic: ${request.topic}
      - Number of questions: ${request.questionCount}
      - Question type: ${request.questionType}
      
      You MUST respond ONLY with a valid JSON array of question objects. Do not include markdown formatting or backticks around the JSON.
      Each object must follow this format:
      {
        "question": "The question text in Arabic",
        "type": "multiple_choice" or "true_false",
        "options": ["option 1", "option 2", "option 3", "option 4"], // only for multiple_choice
        "correctAnswer": "The exact string of the correct option, or 'صحيح'/'خطأ' for true_false",
        "explanation": "Brief explanation of the answer in Arabic"
      }`;

      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please generate ${request.questionCount} questions about ${request.topic}.` },
        ],
        model: 'gpt-4o', // Using GPT-4o for better JSON adherence and Arabic reasoning
        temperature: 0.7,
        response_format: { type: 'json_object' }, // Enforce JSON
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error('Empty response from AI provider');
      const parsed = JSON.parse(responseContent);
      const questions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(questions) || questions.length !== request.questionCount || !questions.every((question) => this.isValidQuestion(question))) {
        throw new Error('AI response did not match the requested exam schema');
      }
      return questions;

    } catch (error) {
      this.logger.error('AI exam generation failed', error instanceof Error ? error.message : String(error));
      throw new ServiceUnavailableException('تعذر إنشاء الاختبار الآن. لم يتم إنشاء أسئلة بديلة أو تجريبية.');
    }
  }

  private isValidQuestion(value: any): value is GeneratedQuestion {
    if (!value || typeof value.question !== 'string' || !value.question.trim() || typeof value.correctAnswer !== 'string') return false;
    if (value.type === 'multiple_choice') {
      return Array.isArray(value.options) && value.options.length >= 2 && value.options.length <= 6 &&
        value.options.every((option: unknown) => typeof option === 'string') && value.options.includes(value.correctAnswer);
    }
    return value.type === 'true_false' && ['صحيح', 'خطأ'].includes(value.correctAnswer);
  }
}
