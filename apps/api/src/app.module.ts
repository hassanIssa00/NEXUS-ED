import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './core/database/prisma.module';
import { AuthModule } from './features/auth/auth.module';
import { CommonModule, CustomThrottlerGuard } from './common';
import { SubjectModule } from './subject/subject.module';
import { UserModule } from './user/user.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UploadModule } from './upload/upload.module';
import { GradeModule } from './grade/grade.module';
import { LessonModule } from './lesson/lesson.module';
import { AssignmentModule } from './assignment/assignment.module';
import { ExamModule } from './features/exams/exam.module';
import { ContentModule } from './features/content/content.module';
import { GamesModule } from './features/games/games.module';
import { QRAttendanceModule } from './features/qr-attendance/qr-attendance.module';
import { ParentPortalModule } from './features/parent-portal/parent-portal.module';
import { AttendanceModule } from './attendance/attendance.module';
import { MillionSimpleModule } from './features/million-simple/million-simple.module';
import { HealthModule } from './health/health.module';
// QueueModule disabled in production (no Redis configured)
import { GamificationModule } from './gamification/gamification.module';
// import { ReportModule } from './report/report.module'; // Disabled: depends on QueueModule
import { NotificationModule } from './notifications/notification.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './features/ai/ai.module';
import { ClassModule } from './class/class.module';
import { PaymentModule } from './payment/payment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EventsModule } from './gateway/events.module';

// New Modules
import { TimetableModule } from './features/schedule/schedule.module';
import { TeacherAutomationModule } from './features/teacher-automation/teacher-automation.module';
import { AiContentGeneratorModule } from './features/ai-content-generator/ai-content-generator.module';
import { MillionJourneyModule } from './features/million-journey/million-journey.module';
import { MessagesModule } from './messages/messages.module';
import { ProfileModule } from './profile/profile.module';
import { PlacementAssessmentModule } from './placement-assessment/placement-assessment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },
      { name: 'medium', ttl: 10000, limit: 50  },
      { name: 'long',   ttl: 60000, limit: 200 },
    ]),
    AuthModule,
    CommonModule,
    CacheModule.register({ isGlobal: true, ttl: 300000, max: 1000 }),
    EventsModule,    // ← global real-time gateway
    ClassModule,
    SubjectModule,
    UserModule,
    EnrollmentModule,
    AnalyticsModule,
    UploadModule,
    GradeModule,
    LessonModule,
    AssignmentModule,
    ExamModule,
    ContentModule,
    GamesModule,
    QRAttendanceModule,
    ParentPortalModule,
    AttendanceModule,
    MillionSimpleModule,
    HealthModule,
    // QueueModule.forRoot(), // Disabled until a production Redis-compatible queue is configured.
    GamificationModule,
    // ReportModule, // Disabled: depends on QueueModule (no Redis)
    NotificationModule,
    AdminModule,
    AiModule,
    PaymentModule,
    DashboardModule,
    TimetableModule,
    TeacherAutomationModule,
    AiContentGeneratorModule,
    MillionJourneyModule,
    MessagesModule,
    ProfileModule,
    PlacementAssessmentModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
  ],
})
export class AppModule {}
