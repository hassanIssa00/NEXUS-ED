import { EmailTemplates } from './email-templates';

describe('EmailTemplates', () => {
  it('escapes untrusted names, grades, and weekly summaries', () => {
    const html = EmailTemplates.weeklyReport({
      parentName: '<img src=x onerror=alert(1)>',
      studentName: '<script>alert(1)</script>',
      recentGrades: [{
        subject: '<svg onload=alert(1)>',
        score: 8,
        max: 10,
        name: '<iframe>',
      }],
      weeklySummary: '<script>steal()</script>',
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;svg onload=alert(1)&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('المليون');
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain('تحليل الذكاء الاصطناعي');
  });
});
