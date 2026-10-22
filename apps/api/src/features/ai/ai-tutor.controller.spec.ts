import { Role } from '../../auth/role.enum';
import { AiTutorController } from './ai-tutor.controller';

describe('AiTutorController chat access', () => {
  const createController = (askTutor: jest.Mock) => {
    const portalContext = { build: jest.fn().mockResolvedValue('{"roleScope":"scoped"}') };
    return {
      portalContext,
      controller: new AiTutorController(
        { askTutor } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        portalContext as any,
      ),
    };
  };

  it('allows chat for every authenticated platform role', () => {
    const askMethod = Object.getOwnPropertyDescriptor(AiTutorController.prototype, 'ask')?.value;
    const roles = Reflect.getMetadata('roles', askMethod);
    expect(roles).toEqual(expect.arrayContaining(Object.values(Role)));
  });

  it('does not pass a staff identity as a student record context', async () => {
    const askTutor = jest.fn().mockResolvedValue('إجابة');
    const { controller, portalContext } = createController(askTutor);

    await controller.ask(
      { question: 'كيف أستخدم المنصة؟', portalPath: '/ar/teacher/assignments' },
      { user: { userId: 'teacher-db-id', role: Role.TEACHER, grade: '3' } },
    );

    expect(portalContext.build).toHaveBeenCalledWith(
      'teacher-db-id',
      Role.TEACHER,
      '/ar/teacher/assignments',
      'كيف أستخدم المنصة؟',
    );
    expect(askTutor).toHaveBeenCalledWith(
      'كيف أستخدم المنصة؟',
      {
        subject: undefined,
        role: Role.TEACHER,
        grade: undefined,
        studentId: undefined,
        portalPath: '/ar/teacher/assignments',
        portalData: '{"roleScope":"scoped"}',
      },
      [],
    );
  });
});
