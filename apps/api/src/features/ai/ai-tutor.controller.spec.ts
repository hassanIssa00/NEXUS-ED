import { Role } from '../../auth/role.enum';
import { AiTutorController } from './ai-tutor.controller';

describe('AiTutorController chat access', () => {
  const createController = (askTutor: jest.Mock) => new AiTutorController(
    { askTutor } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  it('allows chat for every authenticated platform role', () => {
    const askMethod = Object.getOwnPropertyDescriptor(AiTutorController.prototype, 'ask')?.value;
    const roles = Reflect.getMetadata('roles', askMethod);
    expect(roles).toEqual(expect.arrayContaining(Object.values(Role)));
  });

  it('does not pass a staff identity as a student record context', async () => {
    const askTutor = jest.fn().mockResolvedValue('إجابة');
    const controller = createController(askTutor);

    await controller.ask(
      { question: 'كيف أستخدم المنصة؟' },
      { user: { userId: 'teacher-db-id', role: Role.TEACHER, grade: '3' } },
    );

    expect(askTutor).toHaveBeenCalledWith(
      'كيف أستخدم المنصة؟',
      { subject: undefined, role: Role.TEACHER, grade: undefined, studentId: undefined },
      [],
    );
  });
});
