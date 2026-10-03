import type { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { PrismaService } from '../core/database/prisma.service';
import { EventsGateway } from './events.gateway';

type ClassQuery = {
  where: { id: string; schoolId: string; OR?: unknown[] };
  select: { id: true };
};

describe('EventsGateway class room access', () => {
  const makeGateway = (role: string, allowed: boolean) => {
    const jwtService = {
      verify: jest.fn(() => ({ sub: 'user-1', schoolId: 'school-1' })),
    };
    const findClass = jest.fn((query: ClassQuery) => {
      void query;
      return Promise.resolve(allowed ? { id: 'class-1' } : null);
    });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          role,
          schoolId: 'school-1',
          isActive: true,
        }),
      },
      class: { findFirst: findClass },
    };
    return {
      gateway: new EventsGateway(
        jwtService as unknown as JwtService,
        prisma as unknown as PrismaService,
      ),
      prisma,
      findClass,
    };
  };

  const makeSocket = (role: string) => {
    const join = jest.fn();
    const socket = {
      data: { user: { userId: 'user-1', role, schoolId: 'school-1' } },
      join,
    } as unknown as Socket;
    return { socket, join };
  };

  it('joins only a class the student is enrolled in', async () => {
    const { gateway, findClass } = makeGateway('STUDENT', true);
    const { socket, join } = makeSocket('STUDENT');

    const result = await gateway.handleJoinClass(socket, {
      classId: 'class-1',
    });

    expect(findClass.mock.calls[0]?.[0].where).toMatchObject({
      id: 'class-1',
      schoolId: 'school-1',
      OR: [{ students: { some: { studentId: 'user-1' } } }],
    });
    expect(join).toHaveBeenCalledWith('class:class-1');
    expect(result).toEqual({
      event: 'classJoined',
      data: { classId: 'class-1' },
    });
  });

  it('denies an unassigned teacher without joining the room', async () => {
    const { gateway } = makeGateway('TEACHER', false);
    const { socket, join } = makeSocket('TEACHER');

    const result = await gateway.handleJoinClass(socket, {
      classId: 'class-1',
    });

    expect(join).not.toHaveBeenCalled();
    expect(result).toEqual({
      event: 'classJoinDenied',
      data: { classId: 'class-1' },
    });
  });

  it('denies unrecognized roles and malformed class identifiers', async () => {
    const { gateway, findClass } = makeGateway('ACCOUNTANT', true);
    const { socket, join } = makeSocket('ACCOUNTANT');

    const deniedRole = await gateway.handleJoinClass(socket, {
      classId: 'class-1',
    });
    const invalidId = await gateway.handleJoinClass(socket, {
      classId: 'x'.repeat(129),
    });

    expect(findClass).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
    expect(deniedRole.event).toBe('classJoinDenied');
    expect(invalidId.event).toBe('classJoinDenied');
  });
});
