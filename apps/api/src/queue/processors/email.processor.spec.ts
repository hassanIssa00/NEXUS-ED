import { EmailProcessor, EmailJobData } from './email.processor';
import { EmailService } from '../../notifications/email.service';
import { Job } from 'bullmq';

describe('EmailProcessor', () => {
  const sendEmail = jest.fn();
  const emailService = { sendEmail } as unknown as EmailService;
  let processor: EmailProcessor;

  beforeEach(() => {
    sendEmail.mockReset();
    processor = new EmailProcessor(emailService);
  });

  it('sends a rendered, escaped message through the real email service', async () => {
    sendEmail.mockResolvedValue(true);
    const data: EmailJobData = {
      to: 'student@example.org',
      subject: 'Welcome',
      template: 'welcome',
      data: { name: '<Student>', message: 'Welcome & learn' },
    };

    await processor.process({ id: 'job-1', data } as Job<EmailJobData>);

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: data.to,
      subject: data.subject,
      html: expect.stringContaining('&lt;Student&gt;'),
      text: expect.stringContaining('Welcome & learn'),
    }));
  });

  it('fails the job when delivery is unavailable instead of logging false success', async () => {
    sendEmail.mockResolvedValue(false);
    const data: EmailJobData = {
      to: 'student@example.org',
      subject: 'Reset password',
      template: 'password-reset',
      data: { url: 'https://nexus.example.org/reset' },
    };

    await expect(processor.process({ id: 'job-2', data } as Job<EmailJobData>))
      .rejects.toThrow('Email delivery failed');
  });

  it('rejects invalid recipients before contacting the email service', async () => {
    const data: EmailJobData = {
      to: 'not-an-email',
      subject: 'Notice',
      template: 'notification',
      data: {},
    };

    await expect(processor.process({ id: 'job-3', data } as Job<EmailJobData>))
      .rejects.toThrow('valid recipient');
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
