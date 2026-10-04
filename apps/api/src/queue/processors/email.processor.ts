import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../notifications/email.service';

export interface EmailJobData {
  to: string;
  subject: string;
  template: 'welcome' | 'password-reset' | 'notification' | 'report';
  data: Record<string, unknown>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function safeHttpsUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function renderEmail(job: EmailJobData): { html: string; text: string } {
  const name = typeof job.data.name === 'string' ? job.data.name : '';
  const message = typeof job.data.message === 'string' ? job.data.message : '';
  const safeName = escapeHtml(name);
  const safeMessage = escapeHtml(message);
  const actionUrl = safeHttpsUrl(job.data.url);
  const labels: Record<EmailJobData['template'], string> = {
    welcome: 'مرحباً بك في نكسس',
    'password-reset': 'استعادة كلمة المرور',
    notification: 'إشعار من نكسس',
    report: 'تقرير من نكسس',
  };
  const content = safeMessage || labels[job.template];
  const action = actionUrl
    ? `<p><a href="${escapeHtml(actionUrl)}">فتح نكسس</a></p>`
    : '';
  const greeting = safeName ? `<p>مرحباً ${safeName}</p>` : '';
  const html = `<!doctype html><html lang="ar" dir="rtl"><body><main><h1>${labels[job.template]}</h1>${greeting}<p>${content}</p>${action}</main></body></html>`;
  const text = [labels[job.template], name ? `مرحباً ${name}` : '', message || labels[job.template], actionUrl || '']
    .filter(Boolean)
    .join('\n\n');
  return { html, text };
}

@Injectable()
@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Processing email job ${job.id}`);

    const { to, subject } = job.data;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject.trim()) {
      throw new Error('Email job requires a valid recipient and subject');
    }

    const rendered = renderEmail(job.data);
    const sent = await this.emailService.sendEmail({ to, subject, ...rendered });
    if (!sent) {
      throw new Error('Email delivery failed; the queue will retry this job');
    }

    this.logger.log(`Email delivered for job ${job.id}`);
  }
}
