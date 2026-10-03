import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReportJobData } from '../queue/processors/report.processor';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectQueue('reports') private readonly reportQueue: Queue<ReportJobData>,
  ) {}

  /**
   * Generate student certificate PDF
   */
  async generateStudentCertificate(
    studentId: string,
    data: {
      studentName: string;
      className: string;
      grade: string;
      year: string;
    },
  ): Promise<{ jobId: string }> {
    const job = await this.reportQueue.add('student-certificate', {
      type: 'student-certificate',
      format: 'pdf',
      data,
      userId: studentId,
    });

    this.logger.log(
      `Created certificate job ${job.id} for student ${studentId}`,
    );
    return { jobId: job.id };
  }

  /**
   * Generate attendance report (Excel)
   */
  async generateAttendanceReport(
    classId: string,
    data: {
      className: string;
      startDate: string;
      endDate: string;
      rows: Array<{
        studentName: string;
        date: string;
        status: string;
      }>;
    },
  ): Promise<{ jobId: string }> {
    const job = await this.reportQueue.add('attendance-report', {
      type: 'attendance-report',
      format: 'excel',
      data,
      userId: classId,
    });

    this.logger.log(
      `Created attendance report job ${job.id} for class ${classId}`,
    );
    return { jobId: job.id };
  }

  /**
   * Generate grades report (Excel)
   */
  async generateGradesReport(
    classId: string,
    data: {
      className: string;
      subject: string;
      rows: Array<{
        studentName: string;
        grade: number;
        percentage: string;
      }>;
    },
  ): Promise<{ jobId: string }> {
    const job = await this.reportQueue.add('grades-report', {
      type: 'grades-report',
      format: 'excel',
      data,
      userId: classId,
    });

    this.logger.log(`Created grades report job ${job.id} for class ${classId}`);
    return { jobId: job.id };
  }

  /**
   * Check job status
   */
  async getJobStatus(jobId: string) {
    const job = await this.reportQueue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    return {
      status: state,
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
