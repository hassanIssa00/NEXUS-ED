import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
  private gmailAccessToken?: string;
  private gmailAccessTokenExpiresAt = 0;
  private gmailTokenRefresh?: Promise<string>;

  constructor() {
    this.initializeTransporter();
  }

  isConfigured(): boolean {
    const user = process.env.SMTP_USER?.trim();
    if (!user) return false;

    return Boolean(
      this.getGmailOAuthConfig() || process.env.SMTP_PASS?.trim(),
    );
  }

  private initializeTransporter() {
    // Gmail API OAuth keeps the grant limited to sending mail. It is preferred
    // when fully configured; SMTP App Password remains a compatible fallback.
    if (this.getGmailOAuthConfig()) return;

    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: Number(process.env.SMTP_PORT || '587') === 465,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
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
        this.logger.error(`SMTP connection failed (${error.name}).`);
      } else {
        this.logger.log('Email service ready ✉️');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const gmailOAuth = this.getGmailOAuthConfig();
    if (!gmailOAuth && !this.transporter) {
      this.logger.warn('Email service not initialized. Skipping email.');
      return false;
    }

    try {
      if (gmailOAuth) return await this.sendWithGmailApi(options, gmailOAuth);

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
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error(`Email delivery failed (${errorName}).`);
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
    const gmailOAuth = this.getGmailOAuthConfig();
    if (gmailOAuth) {
      try {
        await this.getGmailAccessToken(gmailOAuth);
        return true;
      } catch (error) {
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        this.logger.error(`Gmail OAuth readiness failed (${errorName}).`);
        return false;
      }
    }

    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  private getGmailOAuthConfig(): {
    user: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  } | null {
    const user = process.env.SMTP_USER?.trim();
    const clientId = process.env.GMAIL_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim();
    const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim();

    if (!user || !clientId || !clientSecret || !refreshToken) return null;
    return { user, clientId, clientSecret, refreshToken };
  }

  private async getGmailAccessToken(config: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }): Promise<string> {
    if (
      this.gmailAccessToken &&
      Date.now() < this.gmailAccessTokenExpiresAt - 60_000
    ) {
      return this.gmailAccessToken;
    }

    if (this.gmailTokenRefresh !== undefined) return this.gmailTokenRefresh;

    this.gmailTokenRefresh = (async () => {
      const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      });
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        | { access_token?: string; expires_in?: number }
        | null;

      if (!response.ok || !payload?.access_token) {
        throw new Error(`Google OAuth token refresh failed (${response.status}).`);
      }

      this.gmailAccessToken = payload.access_token;
      this.gmailAccessTokenExpiresAt =
        Date.now() + Math.max(payload.expires_in ?? 3600, 60) * 1000;
      return this.gmailAccessToken;
    })();

    try {
      return await this.gmailTokenRefresh;
    } finally {
      this.gmailTokenRefresh = undefined;
    }
  }

  private async sendWithGmailApi(
    options: EmailOptions,
    config: {
      user: string;
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    },
  ): Promise<boolean> {
    const accessToken = await this.getGmailAccessToken(config);
    const senderEmail = process.env.SMTP_FROM_EMAIL?.trim() || config.user;
    const senderName = options.fromName || process.env.SMTP_FROM_NAME || 'Nexus EDU';
    const rawMessage = this.createRawGmailMessage(
      options,
      senderEmail,
      senderName,
    );
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage }),
      },
    );

    if (!response.ok) {
      this.logger.error(`Gmail API send failed (HTTP ${response.status}).`);
      return false;
    }

    const result = (await response.json().catch(() => null)) as
      | { id?: string }
      | null;
    this.logger.log(`Email sent successfully: ${result?.id || 'Gmail API'}`);
    return true;
  }

  private createRawGmailMessage(
    options: EmailOptions,
    senderEmail: string,
    senderName: string,
  ): string {
    const safeHeader = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();
    const encodeHeader = (value: string) =>
      `=?UTF-8?B?${Buffer.from(safeHeader(value), 'utf8').toString('base64')}?=`;
    const encodeMimeBody = (value: string) =>
      Buffer.from(value.replace(/\r?\n/g, '\r\n'), 'utf8')
        .toString('base64')
        .match(/.{1,76}/g)
        ?.join('\r\n') || '';

    const headers = [
      `From: ${encodeHeader(senderName)} <${safeHeader(senderEmail)}>`,
      `To: ${safeHeader(options.to)}`,
      `Subject: ${encodeHeader(options.subject)}`,
      'MIME-Version: 1.0',
    ];
    const hasText = Boolean(options.text?.length);
    let mimeMessage: string;

    if (hasText) {
      const boundary = `nexus-${randomUUID()}`;
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      mimeMessage = [
        ...headers,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        encodeMimeBody(options.text || ''),
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        encodeMimeBody(options.html),
        `--${boundary}--`,
        '',
      ].join('\r\n');
    } else {
      headers.push('Content-Type: text/html; charset="UTF-8"');
      headers.push('Content-Transfer-Encoding: base64');
      mimeMessage = [...headers, '', encodeMimeBody(options.html), ''].join('\r\n');
    }

    return Buffer.from(mimeMessage, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}
