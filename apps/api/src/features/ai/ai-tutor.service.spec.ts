import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { GamificationService } from '../../gamification/gamification.service';
import { AiTutorService } from './ai-tutor.service';

describe('AiTutorService', () => {
  it('returns the tutor answer when the non-critical XP reward fails', async () => {
    const gamification = { awardXp: jest.fn().mockRejectedValue(new Error('reward write failed')) };
    const service = new AiTutorService(
      { get: jest.fn() } as unknown as ConfigService,
      { smartStudentProfile: { findUnique: jest.fn().mockResolvedValue(null) } } as unknown as PrismaService,
      gamification as unknown as GamificationService,
    );
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: 'إجابة تعليمية' } }] });
    (service as any).ai = {
      client: { chat: { completions: { create } } },
      model: 'qwen/qwen3.8-27b',
      name: 'Groq',
    };

    await expect(service.askTutor('اشرح السؤال', { role: 'STUDENT', studentId: 'student-1' }))
      .resolves.toBe('إجابة تعليمية');
    expect(gamification.awardXp).toHaveBeenCalledWith('student-1', 5, 'استخدام المعلم الذكي');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'qwen/qwen3.8-27b',
      max_completion_tokens: 800,
      reasoning_effort: 'none',
    }));
  });

  it('continues with the default tutor style when the optional profile table is unavailable', async () => {
    const prisma = { smartStudentProfile: { findUnique: jest.fn().mockRejectedValue(new Error('table missing')) } };
    const service = new AiTutorService(
      { get: jest.fn() } as unknown as ConfigService,
      prisma as unknown as PrismaService,
      { awardXp: jest.fn() } as unknown as GamificationService,
    );
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: 'إجابة متاحة' } }] });
    (service as any).ai = {
      client: { chat: { completions: { create } } },
      model: 'qwen/qwen3.8-27b',
      name: 'Groq',
    };

    await expect(service.askTutor('اشرح لي', { role: 'STUDENT', studentId: 'student-1' }))
      .resolves.toBe('إجابة متاحة');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
