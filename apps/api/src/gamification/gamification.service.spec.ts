import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../gateway/events.gateway';

describe('GamificationService', () => {
  let service: GamificationService;

  const prisma = {
    xpTransaction: { create: jest.fn(), findMany: jest.fn() },
    user: { update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
  };
  const eventsGateway = { server: { to: jest.fn().mockReturnThis(), emit: jest.fn() } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();
    service = module.get(GamificationService);
    jest.clearAllMocks();
    eventsGateway.server.to.mockReturnThis();
  });

  it('maps experience totals to the configured learning levels', () => {
    expect(service.calculateLevel(100)).toBe(1);
    expect(service.calculateLevel(501)).toBe(2);
    expect(service.calculateLevel(1501)).toBe(3);
    expect(service.calculateLevel(3001)).toBe(4);
    expect(service.calculateLevel(5001)).toBe(5);
    expect(service.getLevelName(5)).toContain('Nexus');
  });

  it('records XP, updates the user level, and emits the live event', async () => {
    prisma.xpTransaction.create.mockResolvedValue({ id: 'xp-1' });
    prisma.user.update
      .mockResolvedValueOnce({ id: 'student-1', totalXP: 520, level: 1 })
      .mockResolvedValueOnce({ id: 'student-1', level: 2 });

    await expect(service.awardXp('student-1', 20, 'Submitted assignment', 'submission-1'))
      .resolves.toMatchObject({ success: true, totalXP: 520, leveledUp: true });
    expect(prisma.xpTransaction.create).toHaveBeenCalledWith({
      data: { userId: 'student-1', amount: 20, reason: 'Submitted assignment', sourceId: 'submission-1' },
    });
    expect(eventsGateway.server.to).toHaveBeenCalledWith('user:student-1');
    expect(eventsGateway.server.emit).toHaveBeenCalledWith('gamification.xp_awarded', expect.objectContaining({
      amount: 20, totalXP: 520, newLevel: 2,
    }));
  });

  it('limits leaderboard queries to the requested school', async () => {
    prisma.user.findMany.mockResolvedValue([{
      id: 'student-1', name: null, firstName: 'Sara', lastName: 'Ali', avatar: null, totalXP: 70, level: 1,
    }]);

    await expect(service.getLeaderboard('school', 'school-1', 10)).resolves.toEqual([expect.objectContaining({
      userId: 'student-1', name: 'Sara Ali', rank: 1, points: 70,
    })]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: 'STUDENT', isActive: true, schoolId: 'school-1' }, take: 10,
    }));
  });

  it('does not disclose rank or XP when the requested school does not own the user', async () => {
    prisma.user.findUnique.mockResolvedValue({ totalXP: 300, level: 1, schoolId: 'school-2' });
    await expect(service.getUserRank('student-1', 'school-1')).resolves.toMatchObject({ rank: 0, points: 0 });
    expect(prisma.user.count).not.toHaveBeenCalled();
    expect(prisma.xpTransaction.findMany).not.toHaveBeenCalled();
  });
});
