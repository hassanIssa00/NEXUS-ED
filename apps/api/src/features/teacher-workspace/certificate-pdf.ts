import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { once } from 'node:events';
import { join } from 'node:path';

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const SCALE = 3508 / PAGE_WIDTH;
const ASSETS = join(__dirname, 'assets');

type CertificateData = {
  serial: string;
  title: string;
  description?: string | null;
  createdAt: Date;
  school: { name: string };
  student: { name?: string | null };
  issuer?: { name?: string | null };
  schoolPrincipalName?: string | null;
};

let assetsPromise: Promise<{ schoolSeal: Awaited<ReturnType<typeof loadImage>>; nexusLogo: Awaited<ReturnType<typeof loadImage>> }> | undefined;

function loadCertificateAssets() {
  if (assetsPromise === undefined) {
    const arabicFont = GlobalFonts.registerFromPath(join(ASSETS, 'noto-sans-arabic.woff2'), 'NotoSansArabic');
    const latinFont = GlobalFonts.registerFromPath(join(ASSETS, 'noto-sans-latin.woff2'), 'NotoSansLatin');
    if (!arabicFont || !latinFont) throw new Error('Certificate fonts could not be loaded.');
    assetsPromise = Promise.all([
      loadImage(join(ASSETS, 'school-seal.png')),
      loadImage(join(ASSETS, 'nexus-logo.png')),
    ]).then(([schoolSeal, nexusLogo]) => ({ schoolSeal, nexusLogo }));
  }
  return assetsPromise;
}

function font(weight: number, size: number) {
  return `${weight} ${size}px NotoSansArabic, NotoSansLatin`;
}

function fitSize(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, text: string, initial: number, maxWidth: number) {
  let size = initial;
  while (size > 16) {
    ctx.font = font(700, size);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function wrapText(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function roundedRect(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawImageContain(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, image: Awaited<ReturnType<typeof loadImage>>, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawDiamond(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawMedallion(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, cx: number, cy: number) {
  ctx.save();
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = '#c79a49';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.strokeStyle = '#e1c27e';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = '#152b49';
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy - 9);
  ctx.quadraticCurveTo(cx - 6, cy - 13, cx, cy - 8);
  ctx.quadraticCurveTo(cx + 6, cy - 13, cx + 15, cy - 9);
  ctx.lineTo(cx + 15, cy + 11);
  ctx.quadraticCurveTo(cx + 6, cy + 6, cx, cy + 11);
  ctx.quadraticCurveTo(cx - 6, cy + 6, cx - 15, cy + 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d5ad5c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 11);
  ctx.stroke();
  ctx.restore();
}

async function renderCertificatePage(certificate: CertificateData) {
  const { schoolSeal, nexusLogo } = await loadCertificateAssets();
  const publicOrigin = (process.env.NEXUS_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://nexus.masarplatform.org').replace(/\/+$/, '');
  const verificationUrl = `${publicOrigin}/ar/certificates/verify/${encodeURIComponent(certificate.serial)}`;
  const verificationCode = await loadImage(await QRCode.toBuffer(verificationUrl, {
    type: 'png',
    width: 320,
    margin: 1,
    color: { dark: '#152b49', light: '#ffffff' },
  }));
  const canvas = createCanvas(3508, 2480);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#f4f0e7';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(18, 18, PAGE_WIDTH - 36, PAGE_HEIGHT - 36);

  ctx.strokeStyle = '#152b49';
  ctx.lineWidth = 2.2;
  ctx.strokeRect(18, 18, PAGE_WIDTH - 36, PAGE_HEIGHT - 36);
  ctx.strokeStyle = '#c79a49';
  ctx.lineWidth = 0.9;
  ctx.strokeRect(24, 24, PAGE_WIDTH - 48, PAGE_HEIGHT - 48);

  ctx.fillStyle = '#152b49';
  ctx.beginPath();
  ctx.moveTo(18, 18);
  ctx.lineTo(125, 18);
  ctx.lineTo(18, 124);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(PAGE_WIDTH - 18, PAGE_HEIGHT - 18);
  ctx.lineTo(PAGE_WIDTH - 125, PAGE_HEIGHT - 18);
  ctx.lineTo(PAGE_WIDTH - 18, PAGE_HEIGHT - 124);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d5ad5c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(28, 109);
  ctx.lineTo(109, 28);
  ctx.moveTo(PAGE_WIDTH - 28, PAGE_HEIGHT - 109);
  ctx.lineTo(PAGE_WIDTH - 109, PAGE_HEIGHT - 28);
  ctx.stroke();

  drawImageContain(ctx, schoolSeal, 48, 38, 100, 100);
  drawImageContain(ctx, nexusLogo, PAGE_WIDTH - 164, 36, 118, 96);
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#8c6428';
  ctx.font = '700 13px NotoSansLatin';
  ctx.fillText('N E X U S   E D U', PAGE_WIDTH / 2, 54);
  ctx.fillStyle = '#152b49';
  ctx.font = '400 8px NotoSansLatin';
  ctx.fillText('EMPOWERING MINDS  ·  SHAPING TOMORROW', PAGE_WIDTH / 2, 72);
  ctx.direction = 'rtl';
  ctx.fillStyle = '#7a684a';
  ctx.font = font(700, 10);
  ctx.fillText(certificate.school.name || 'مدارس الإخلاص الأهلية', PAGE_WIDTH / 2, 96, 310);

  ctx.strokeStyle = '#c79a49';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(265, 116);
  ctx.lineTo(397, 116);
  ctx.moveTo(445, 116);
  ctx.lineTo(577, 116);
  ctx.stroke();
  drawDiamond(ctx, PAGE_WIDTH / 2, 116, 8, '#c79a49');

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#152b49';
  ctx.font = font(700, 36);
  ctx.fillText('شهادة إنجاز', PAGE_WIDTH / 2, 180);
  ctx.direction = 'ltr';
  ctx.fillStyle = '#9a7135';
  ctx.font = '700 15px NotoSansLatin';
  ctx.fillText('CERTIFICATE OF ACHIEVEMENT', PAGE_WIDTH / 2, 205);

  ctx.strokeStyle = '#d8c18c';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(272, 221);
  ctx.lineTo(397, 221);
  ctx.moveTo(445, 221);
  ctx.lineTo(570, 221);
  ctx.stroke();
  drawDiamond(ctx, PAGE_WIDTH / 2, 221, 9, '#c79a49');

  ctx.direction = 'rtl';
  ctx.fillStyle = '#53647a';
  ctx.font = font(400, 13);
  ctx.fillText('تُمنح بكل فخر واعتزاز إلى', PAGE_WIDTH / 2, 254);
  const studentName = certificate.student.name || 'الطالب';
  ctx.fillStyle = '#9a7135';
  ctx.font = font(700, fitSize(ctx, studentName, 39, 610));
  ctx.fillText(studentName, PAGE_WIDTH / 2, 316, 610);
  ctx.strokeStyle = '#c79a49';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(230, 330);
  ctx.lineTo(612, 330);
  ctx.stroke();
  drawDiamond(ctx, PAGE_WIDTH / 2, 330, 8, '#c79a49');

  ctx.fillStyle = '#53647a';
  ctx.font = font(400, 11);
  const description = certificate.description?.trim() || 'نحتفي بإنجاز يستحق الفخر والتقدير.';
  const descriptionLines = wrapText(ctx, description, 590);
  descriptionLines.forEach((line, index) => ctx.fillText(line, PAGE_WIDTH / 2, 359 + index * 16, 590));

  ctx.strokeStyle = '#c79a49';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(259, 436);
  ctx.lineTo(379, 436);
  ctx.moveTo(463, 436);
  ctx.lineTo(583, 436);
  ctx.stroke();
  ctx.direction = 'rtl';
  ctx.fillStyle = '#152b49';
  ctx.font = font(700, fitSize(ctx, certificate.title, 24, 490));
  ctx.fillText(certificate.title, PAGE_WIDTH / 2, 416, 490);
  drawDiamond(ctx, PAGE_WIDTH / 2, 436, 7, '#c79a49');

  const date = new Intl.DateTimeFormat('ar-SA-u-nu-arab', { year: 'numeric', month: 'long', day: 'numeric' }).format(certificate.createdAt);
  ctx.strokeStyle = '#c79a49';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(42, 459);
  ctx.lineTo(PAGE_WIDTH - 42, 459);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7d6743';
  ctx.font = font(400, 9);
  ctx.fillText('تاريخ الإصدار', 99, 486);
  ctx.fillStyle = '#152b49';
  ctx.font = font(700, 10);
  ctx.fillText(date, 99, 505, 138);
  ctx.strokeStyle = '#a98a54';
  ctx.beginPath();
  ctx.moveTo(51, 518);
  ctx.lineTo(147, 518);
  ctx.stroke();
  ctx.fillStyle = '#7d6743';
  ctx.font = font(400, 8);
  ctx.fillText('تاريخ الاعتماد', 99, 533);

  ctx.fillStyle = '#7d6743';
  ctx.font = font(400, 9);
  ctx.fillText('مدير المدرسة', 276, 486);
  ctx.fillStyle = '#152b49';
  ctx.font = font(700, fitSize(ctx, certificate.schoolPrincipalName || 'مدير المدرسة', 10, 150));
  ctx.fillText(certificate.schoolPrincipalName || 'مدير المدرسة', 276, 505, 150);
  ctx.strokeStyle = '#a98a54';
  ctx.beginPath();
  ctx.moveTo(199, 518);
  ctx.lineTo(353, 518);
  ctx.stroke();
  ctx.fillStyle = '#7d6743';
  ctx.font = font(400, 8);
  ctx.fillText('الإدارة المدرسية', 276, 533);

  drawMedallion(ctx, PAGE_WIDTH / 2, 510);

  ctx.direction = 'ltr';
  ctx.fillStyle = '#152b49';
  ctx.font = '700 10px NotoSansLatin';
  ctx.fillText('Nexus EDU', 566, 504, 128);
  ctx.strokeStyle = '#a98a54';
  ctx.beginPath();
  ctx.moveTo(507, 518);
  ctx.lineTo(625, 518);
  ctx.stroke();
  ctx.direction = 'rtl';
  ctx.fillStyle = '#7d6743';
  ctx.font = font(400, 8);
  ctx.fillText('المنصة التعليمية', 566, 533);

  roundedRect(ctx, 711, 475, 48, 48, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.drawImage(verificationCode, 714, 478, 42, 42);
  ctx.fillStyle = '#7d6743';
  ctx.font = font(400, 7);
  ctx.fillText('تحقق من الشهادة', 735, 538);
  ctx.direction = 'ltr';
  ctx.fillStyle = '#152b49';
  ctx.font = '700 5.4px NotoSansLatin';
  ctx.fillText(certificate.serial, 735, 550, 86);

  return canvas.toBuffer('image/png');
}

export async function renderCertificatePdf(certificate: CertificateData): Promise<Buffer> {
  const pageImage = await renderCertificatePage(certificate);
  const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: {
    Title: certificate.title,
    Author: certificate.school.name,
    Subject: certificate.serial,
  } });
  const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => chunks.push(chunk));
  const complete = once(document, 'end').then(() => Buffer.concat(chunks));
  document.image(pageImage, 0, 0, { width: document.page.width, height: document.page.height });
  document.end();
  return complete;
}
