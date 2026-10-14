import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { AiExamService } from './ai-exam.service';

describe('AiExamService', () => {
  const request = {
    topic: 'الجمع والطرح',
    subject: 'الرياضيات',
    gradeLevel: 'الصف الأول',
    questionCount: 1,
    questionType: 'mixed' as const,
    difficulty: 'MEDIUM' as const,
  };

  const createService = (content: string) => {
    const service = new AiExamService(
      { get: (key: string) => key === 'GROQ_API_KEY' ? 'gsk-test-only' : undefined } as unknown as ConfigService,
    );
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content } }] });
    (service as any).ai = {
      client: { chat: { completions: { create } } },
      model: 'qwen/qwen3.8-27b',
      name: 'Groq',
    };
    return { service, create };
  };

  it('parses the JSON object shape required by structured output and validates each question', async () => {
    const question = {
      question: 'ما ناتج ٢ + ٢؟',
      type: 'multiple_choice',
      options: ['٣', '٤'],
      correctAnswer: '٤',
      explanation: '٢ + ٢ = ٤',
    };
    const { service, create } = createService(JSON.stringify({ questions: [question] }));

    await expect(service.generateExam(request)).resolves.toEqual([question]);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'qwen/qwen3.8-27b',
      response_format: { type: 'json_object' },
    }));
  });

  it('does not return malformed or incomplete AI questions as usable content', async () => {
    const { service } = createService(JSON.stringify({ questions: [{ question: 'سؤال بلا إجابة' }] }));

    await expect(service.generateExam(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
