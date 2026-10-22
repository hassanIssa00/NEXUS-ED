import { renderCertificatePdf } from './certificate-pdf';

describe('renderCertificatePdf', () => {
  it('creates a printable branded PDF with embedded Arabic and school assets', async () => {
    const pdf = await renderCertificatePdf({
      serial: 'NEX-2026-ABC123',
      title: 'شهادة تميز في الرياضيات',
      description: 'تقديرًا للجهد والاجتهاد خلال الفصل الدراسي',
      createdAt: new Date('2026-10-17T12:00:00.000Z'),
      school: { name: 'مدارس الإخلاص الأهلية' },
      student: { name: 'فارس إبراهيم سيد قنيل' },
      issuer: { name: 'خالد عبدالعزيز الحربي' },
    });

    expect(pdf.subarray(0, 4).toString('ascii')).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(100_000);
  });
});
