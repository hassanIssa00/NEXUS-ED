import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EventsGateway } from '../gateway/events.gateway';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    @Optional() private uploads?: UploadService,
  ) {}

  private async signAvatars<T extends { avatar?: string | null }>(items: T[]): Promise<T[]> {
    const references = [...new Set(items
      .map((item) => item.avatar)
      .filter((value): value is string => Boolean(value) && /^(?:storage:\/\/|file:|https?:\/\/)/i.test(value)))];
    if (!references.length || !this.uploads) return items;
    const signed = await this.uploads.getSignedUrlsForReferences(references).catch(() => references);
    const byReference = new Map(references.map((reference, index) => [reference, signed[index] || reference]));
    return items.map((item) => ({ ...item, avatar: item.avatar ? byReference.get(item.avatar) || item.avatar : item.avatar }));
  }

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

    const visible = accessible.filter((conversation) => conversation !== null);
    return Promise.all(visible.map(async (conversation) => {
      const users = await this.signAvatars(conversation.participants.map((participant) => participant.user));
      const byId = new Map(users.map((user) => [user.id, user]));
      return { ...conversation, participants: conversation.participants.map((participant) => ({ ...participant, user: byId.get(participant.userId) || participant.user })) };
    }));
  }

  async getContacts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, schoolId: true, isActive: true },
    });

    if (!user?.isActive) throw new ForbiddenException('Messaging contacts are not available for this account');

    if (user.role === Role.TEACHER) {
      const classes = await this.prisma.class.findMany({
        where: {
          schoolId: user.schoolId || undefined,
          OR: [{ teacherId: userId }, { classSubjects: { some: { teacherId: userId } } }],
        },
        select: { schoolId: true, students: {
          where: { student: { isActive: true, ...(user.schoolId ? { schoolId: user.schoolId } : {}) } },
          select: { student: {
            select: {
              id: true, name: true, firstName: true, lastName: true, role: true, avatar: true,
              parents: {
                where: { parent: { isActive: true, ...(user.schoolId ? { schoolId: user.schoolId } : {}) } },
                select: { parent: { select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true } } },
              },
            },
          } },
        } },
      });
      const linkedSchoolIds = [...new Set(classes.map((classroom) => classroom.schoolId).filter(Boolean))];
      if (!user.schoolId && linkedSchoolIds.length !== 1) {
        if (!linkedSchoolIds.length) return [];
        throw new ForbiddenException('Messaging contacts are not available for accounts linked to multiple schools');
      }
      const contacts = new Map<string, { id: string; name: string | null; firstName: string | null; lastName: string | null; role: Role; avatar: string | null }>();
      for (const classroom of classes) {
        for (const enrollment of classroom.students) {
          contacts.set(enrollment.student.id, enrollment.student);
          for (const relationship of enrollment.student.parents) {
            contacts.set(relationship.parent.id, relationship.parent);
          }
        }
      }
      return this.signAvatars([...contacts.values()].sort((left, right) =>
        `${left.firstName || ''} ${left.lastName || ''} ${left.name || ''}`.localeCompare(`${right.firstName || ''} ${right.lastName || ''} ${right.name || ''}`, 'ar'),
      ));
    }

    if (user.role !== Role.STUDENT && user.role !== Role.PARENT) {
      throw new ForbiddenException('Messaging contacts are not available for this account');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
          class: { schoolId: user.schoolId || undefined },
        student: user.role === Role.STUDENT
            ? { id: userId, ...(user.schoolId ? { schoolId: user.schoolId } : {}), isActive: true }
          : { ...(user.schoolId ? { schoolId: user.schoolId } : {}), isActive: true, parents: { some: { parentId: userId } } },
      },
      select: { classId: true, class: { select: { schoolId: true } } },
    });
    if (!enrollments.length) return [];
    const linkedSchoolIds = [...new Set(enrollments.map((item) => item.class.schoolId).filter(Boolean))];
    if (!user.schoolId && linkedSchoolIds.length !== 1) {
      if (!linkedSchoolIds.length) return [];
      throw new ForbiddenException('Messaging contacts are not available for accounts linked to multiple schools');
    }
    const schoolId = user.schoolId || linkedSchoolIds[0];
    const classes = await this.prisma.class.findMany({
      where: { id: { in: [...new Set(enrollments.map((item) => item.classId))] }, schoolId },
      select: { teacherId: true, classSubjects: { select: { teacherId: true } } },
    });
    const teacherIds = [...new Set(classes.flatMap((classroom) => [classroom.teacherId, ...classroom.classSubjects.map((assignment) => assignment.teacherId)]).filter((id): id is string => Boolean(id)))];
    if (!teacherIds.length) return [];
    const teachers = await this.prisma.user.findMany({
      where: {
        id: { in: teacherIds },
        schoolId,
        role: Role.TEACHER,
        isActive: true,
      },
      select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true },
      orderBy: [{ name: 'asc' }, { firstName: 'asc' }],
    });
    return this.signAvatars(teachers);
  }

  async getMessages(conversationId: string, userId: string) {
    const participant = await this.verifyParticipant(conversationId, userId);
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, role: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const senders = await this.signAvatars(messages.map((message) => message.sender));
    const byId = new Map(senders.map((sender) => [sender.id, sender]));
    return messages.map((message) => ({ ...message, sender: byId.get(message.senderId) || message.sender }));
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

    const [sender] = await this.signAvatars([message.sender]);
    const signedMessage = { ...message, sender };
    const participants = await this.prisma.conversationParticipant.findMany({ where: { conversationId } });
    for (const participant of participants) {
      if (participant.userId !== senderId) this.eventsGateway.emitMessage(participant.userId, signedMessage);
    }

    return signedMessage;
  }

  async startDirectConversation(initiatorId: string, targetUserId: string) {
    if (!targetUserId || initiatorId === targetUserId) {
      throw new BadRequestException('Invalid conversation recipient');
    }

    const initiator = await this.prisma.user.findUnique({ where: { id: initiatorId }, select: { role: true } });
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
    const isLearnerOrParent = (role: Role) => role === Role.STUDENT || role === Role.PARENT;
    if (!initiator || !target || !(
      (initiator.role === Role.TEACHER && isLearnerOrParent(target.role))
      || (isLearnerOrParent(initiator.role) && target.role === Role.TEACHER)
    )) throw new ForbiddenException('Direct conversations are limited to linked teachers, students, and parents');
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
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true } },
          },
        },
      },
    });

    if (existing?.participants.length === 2) return this.withSignedParticipants(existing);

    const created = await this.prisma.conversation.create({
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
    return this.withSignedParticipants(created);
  }

  private async withSignedParticipants<T extends { participants: Array<{ userId: string; user: { id: string; avatar?: string | null } }> }>(conversation: T): Promise<T> {
    const users = await this.signAvatars(conversation.participants.map((participant) => participant.user));
    const byId = new Map(users.map((user) => [user.id, user]));
    return {
      ...conversation,
      participants: conversation.participants.map((participant) => ({
        ...participant,
        user: byId.get(participant.userId) || participant.user,
      })),
    };
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
    if (users.length !== 2 || users.some((user) => !user.isActive)) throw new ForbiddenException('Conversation participants must be active users in the same school');

    const teacher = users.find((user) => user.role === Role.TEACHER);
    const peer = users.find((user) => user.role === Role.STUDENT || user.role === Role.PARENT);
    if (!peer || !teacher) throw new ForbiddenException('Direct conversations are limited to a student or parent and an assigned teacher');

    let schoolId = peer.schoolId;
    if (!schoolId) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          student: peer.role === Role.STUDENT
            ? { id: peer.id, isActive: true }
            : { isActive: true, parents: { some: { parentId: peer.id } } },
        },
        select: { class: { select: { schoolId: true } } },
        take: 200,
      });
      const linkedSchoolIds = [...new Set(enrollments.map((item) => item.class.schoolId).filter((id): id is string => Boolean(id)))];
      if (linkedSchoolIds.length !== 1) throw new ForbiddenException('Conversation participants must be linked to one school');
      schoolId = linkedSchoolIds[0];
    }
    if (!schoolId || (teacher.schoolId && teacher.schoolId !== schoolId)) throw new ForbiddenException('Conversation participants must be active users in the same school');
    const studentFilter = peer.role === Role.STUDENT
      ? { id: peer.id, ...(peer.schoolId ? { schoolId: peer.schoolId } : {}), isActive: true }
      : { ...(peer.schoolId ? { schoolId: peer.schoolId } : {}), isActive: true, parents: { some: { parentId: peer.id } } };
    const assignment = await this.prisma.class.findFirst({
      where: {
        schoolId,
        OR: [{ teacherId: teacher.id }, { classSubjects: { some: { teacherId: teacher.id } } }],
        students: { some: { student: studentFilter } },
      },
      select: { id: true },
    });
    if (!assignment) throw new ForbiddenException('This teacher is not assigned to the student or parent');
  }
}
