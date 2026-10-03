import { Module } from '@nestjs/common';
import { TeacherAutomationController } from './teacher-automation.controller';
import { TeacherAutomationService } from './teacher-automation.service';

/**
 * Teacher Automation Module
 * Handles automated rules and workflows for teachers
 */
@Module({
  controllers: [TeacherAutomationController],
  providers: [TeacherAutomationService],
  exports: [TeacherAutomationService],
})
export class TeacherAutomationModule {}
