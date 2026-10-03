import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EventsGateway } from '../gateway/events.gateway';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true } },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const accessible = await Promise.all(conversations.map(async (conversation) => {
      if (conversation.type !== 'direct' || conversation.participants.length !== 2) return null;
      try {
        await this.assertDirectPairAccess(conversation.participants[0].userId, conversation.participants[1].userId);
        return conversation;
      } catch (error) {
        if (error instanceof ForbiddenException) return null;
        throw error;
      }
    }));

    return accessible.filter((conversation) => conversation !== null);
  }

  async getContacts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, schoolId: true, isActive: true },
    });

    if (!user?.isActive || !user.schoolId || !new Set<string>([Role.STUDENT, Role.PARENT]).has(user.role)) {
      throw new ForbiddenException('Messaging contacts are not available for this account');
    }

    const relatedStudentFilter = user.role === Role.STUDENT
      ? { id: userId }
      : { parents: { some: { parentId: userId } } };

    return this.prisma.user.findMany({
      where: {
        schoolId: user.schoolId,
        role: Role.TEACHER,
        isActive: true,
        taughtClasses: {
          some: {
            schoolId: user.schoolId,
            students: { some: { student: relatedStudentFilter } },
          },
        },
      },
      select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true },
      orderBy: [{ name: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getMessages(conversationId: string, userId: string) {
    const participant = await this.verifyParticipant(conversationId, userId);
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, role: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(senderId: string, conversationId: string, content: string, attachments?: string) {
    if (!content.trim()) throw new BadRequestException('Message content is required');
    await this.verifyParticipant(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: { senderId, conversationId, content: content.trim(), attachments },
      include: {
        sender: { select: { id: true, name: true, role: true, avatar: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const participants = await this.prisma.conversationParticipant.findMany({ where: { conversationId } });
    for (const participant of participants) {
      if (participant.userId !== senderId) this.eventsGateway.emitMessage(participant.userId, message);
    }

    return message;
  }

  async startDirectConversation(initiatorId: string, targetUserId: string) {
    if (!targetUserId || initiatorId === targetUserId) {
      throw new BadRequestException('Invalid conversation recipient');
    }

    const initiator = await this.prisma.user.findUnique({ where: { id: initiatorId }, select: { role: true } });
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
    if (!initiator || !target || !new Set<string>([Role.STUDENT, Role.PARENT]).has(initiator.role) || target.role !== Role.TEACHER) {
      throw new ForbiddenException('Only a student or parent can start a conversation with an assigned teacher');
    }
    await this.assertDirectPairAccess(initiatorId, targetUserId);

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'direct',
        AND: [
          { participants: { some: { userId: initiatorId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
        participants: { every: { userId: { in: [initiatorId, targetUserId] } } },
      },
      include: { participants: true },
    });

    if (existing?.participants.length === 2) return existing;

    return this.prisma.conversation.create({
      data: {
        type: 'direct',
        participants: {
          create: [
            { userId: initiatorId, role: 'admin' },
            { userId: targetUserId, role: 'member' },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true } },
          },
        },
      },
    });
  }

  private async verifyParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { id: true, userId: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const participant = conversation.participants.find((item) => item.userId === userId);
    if (!participant) throw new ForbiddenException('You are not a participant in this conversation');
    if (conversation.type !== 'direct' || conversation.participants.length !== 2) {
      throw new ForbiddenException('This conversation type is not enabled');
    }

    await this.assertDirectPairAccess(conversation.participants[0].userId, conversation.participants[1].userId);
    return participant;
  }

  private async assertDirectPairAccess(firstUserId: string, secondUserId: string) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: [firstUserId, secondUserId] } },
      select: { id: true, role: true, schoolId: true, isActive: true },
    });
    if (users.length !== 2 || users.some((user) => !user.isActive || !user.schoolId) || users[0].schoolId !== users[1].schoolId) {
      throw new ForbiddenException('Conversation participants must be active users in the same school');
    }

    const studentOrParent = users.find((user) => user.role === Role.STUDENT || user.role === Role.PARENT);
    const teacher = users.find((user) => user.role === Role.TEACHER);
    if (!studentOrParent || !teacher) {
      throw new ForbiddenException('Direct conversations are limited to a student or parent and an assigned teacher');
    }

    const schoolId = studentOrParent.schoolId;
    const enrollmentFilter = studentOrParent.role === Role.STUDENT
      ? { studentId: studentOrParent.id, student: { schoolId } }
      : { student: { schoolId, parents: { some: { parentId: studentOrParent.id } } } };
    const assignment = await this.prisma.class.findFirst({
      where: {
        schoolId,
        teacherId: teacher.id,
        students: { some: enrollmentFilter },
      },
      select: { id: true },
    });
    if (!assignment) throw new ForbiddenException('This teacher is not assigned to the student or parent');
  }
}
