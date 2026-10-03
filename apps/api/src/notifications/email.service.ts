import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor() {
    this.initializeTransporter();
  }

  isConfigured(): boolean {
    return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
  }

  private initializeTransporter() {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (!config.auth.user || !config.auth.pass) {
      this.logger.warn(
        'SMTP credentials not configured. Email service disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport(config);

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('Email service ready ✉️');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email service not initialized. Skipping email.');
      return false;
    }

    try {
      const mailOptions = {
        from: `${options.fromName || process.env.SMTP_FROM_NAME || 'Nexus EDU'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<number> {
    let successCount = 0;

    for (const email of emails) {
      const sent = await this.sendEmail(email);
      if (sent) successCount++;

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.logger.log(`Sent ${successCount}/${emails.length} emails`);
    return successCount;
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
