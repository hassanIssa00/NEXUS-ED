import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getStudentProfile(studentId: string) {
    const profile = await this.prisma.smartStudentProfile.findUnique({
      where: { userId: studentId },
    });

    if (!profile) {
      // Create a default profile if it doesn't exist
      return this.prisma.smartStudentProfile.create({
        data: {
          userId: studentId,
          learningStyle: 'VISUAL',
          strengthSubjects: [],
          weakSubjects: [],
          performanceTrend: 'STABLE',
        },
      });
    }

    return profile;
  }

  async getStudentSkillMasteries(studentId: string) {
    return this.prisma.studentSkillMastery.findMany({
      where: { studentId },
      include: {
        skillNode: {
          include: {
            subject: true,
          },
        },
      },
    });
  }

  async getSubjectSkillNodes(subjectId: string) {
    return this.prisma.skillNode.findMany({
      where: { subjectId },
    });
  }
}
