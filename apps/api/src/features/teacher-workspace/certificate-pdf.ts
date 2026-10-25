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
  issuer: { name?: string | null };
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

function drawStar(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, cx: number, cy: number, outer: number, inner: number, color: string, points = 5) {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawLogo(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, image: Awaited<ReturnType<typeof loadImage>>, cx: number, cy: number, diameter: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  const scale = Math.min((diameter - 10) / image.width, (diameter - 10) / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, cx - width / 2, cy - height / 2, width, height);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.68)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMedal(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, cx: number, cy: number) {
  ctx.save();
  ctx.fillStyle = '#ec6651';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 15);
  ctx.lineTo(cx - 12, cy + 40);
  ctx.lineTo(cx, cy + 32);
  ctx.lineTo(cx + 12, cy + 40);
  ctx.lineTo(cx + 14, cy + 15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#21b7a5';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 16);
  ctx.lineTo(cx - 5, cy + 34);
  ctx.lineTo(cx, cy + 29);
  ctx.lineTo(cx + 5, cy + 34);
  ctx.lineTo(cx + 8, cy + 16);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  for (let index = 0; index < 12; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 6;
    const radius = index % 2 === 0 ? 27 : 23;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#f4bd4d';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  drawStar(ctx, cx, cy, 12, 5, '#ef7657');
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
  ctx.fillStyle = '#f2f7f8';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  ctx.save();
  ctx.shadowColor = 'rgba(17, 48, 72, 0.12)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  roundedRect(ctx, 24, 22, PAGE_WIDTH - 48, PAGE_HEIGHT - 44, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
  roundedRect(ctx, 24, 22, PAGE_WIDTH - 48, PAGE_HEIGHT - 44, 18);
  ctx.strokeStyle = '#dce7e9';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  roundedRect(ctx, 25, 23, PAGE_WIDTH - 50, 112, 17);
  ctx.clip();
  ctx.fillStyle = '#152b49';
  ctx.fillRect(25, 23, PAGE_WIDTH - 50, 112);
  ctx.fillStyle = '#1b927f';
  ctx.beginPath();
  ctx.moveTo(25, 112);
  ctx.bezierCurveTo(190, 91, 260, 144, 420, 118);
  ctx.bezierCurveTo(585, 92, 683, 128, 817, 101);
  ctx.lineTo(817, 137);
  ctx.lineTo(25, 137);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0b94b';
  ctx.beginPath();
  ctx.arc(789, 47, 41, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ed7057';
  ctx.beginPath();
  ctx.arc(53, 118, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawLogo(ctx, schoolSeal, 81, 76, 66);
  drawLogo(ctx, nexusLogo, PAGE_WIDTH - 81, 76, 66);
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = font(700, 18);
  ctx.fillText(certificate.school.name || 'مدارس الإخلاص الأهلية', PAGE_WIDTH / 2, 67, 490);
  ctx.fillStyle = '#d3e3ed';
  ctx.font = font(400, 11);
  ctx.fillText('نكسس التعليمية  ·  نصنع مساحة لكل إنجاز', PAGE_WIDTH / 2, 91);

  ctx.fillStyle = '#f4bd4d';
  ctx.beginPath();
  ctx.arc(146, 154, 3, 0, Math.PI * 2);
  ctx.fill();
  drawStar(ctx, 693, 157, 7, 3, '#ed7057');
  drawStar(ctx, 171, 202, 5, 2, '#20ad9a');
  drawStar(ctx, 671, 203, 5, 2, '#f4bd4d');
  drawMedal(ctx, PAGE_WIDTH / 2, 151);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#152b49';
  ctx.font = font(700, 31);
  ctx.fillText('شهادة إنجاز وتقدير', PAGE_WIDTH / 2, 215);
  ctx.fillStyle = '#607286';
  ctx.font = font(400, 13);
  ctx.fillText('تُمنح بكل فخر واعتزاز إلى', PAGE_WIDTH / 2, 242);

  roundedRect(ctx, 103, 254, PAGE_WIDTH - 206, 65, 13);
  ctx.fillStyle = '#e9f7f4';
  ctx.fill();
  ctx.strokeStyle = '#b9e5dc';
  ctx.lineWidth = 1;
  ctx.stroke();
  drawStar(ctx, 132, 286, 11, 5, '#f0b94b');
  drawStar(ctx, PAGE_WIDTH - 132, 286, 11, 5, '#ed7057');
  const studentName = certificate.student.name || 'الطالب';
  ctx.fillStyle = '#137968';
  ctx.font = font(700, fitSize(ctx, studentName, 32, 590));
  ctx.fillText(studentName, PAGE_WIDTH / 2, 295, 585);

  ctx.fillStyle = '#607286';
  ctx.font = font(400, 12);
  ctx.fillText('نحتفي بإنجاز', PAGE_WIDTH / 2, 348);
  const titleSize = fitSize(ctx, certificate.title, 19, 650);
  ctx.fillStyle = '#152b49';
  ctx.font = font(700, titleSize);
  ctx.fillText(certificate.title, PAGE_WIDTH / 2, 377, 650);

  if (certificate.description?.trim()) {
    ctx.fillStyle = '#607286';
    ctx.font = font(400, 11);
    const lines = wrapText(ctx, certificate.description, 610);
    lines.forEach((line, index) => ctx.fillText(line, PAGE_WIDTH / 2, 402 + index * 16, 610));
  }

  const date = new Intl.DateTimeFormat('ar-SA-u-nu-arab', { year: 'numeric', month: 'long', day: 'numeric' }).format(certificate.createdAt);
  roundedRect(ctx, 45, 442, PAGE_WIDTH - 90, 111, 12);
  ctx.fillStyle = '#f7f9fb';
  ctx.fill();
  ctx.strokeStyle = '#e3eaee';
  ctx.stroke();

  ctx.strokeStyle = '#dce5e9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(233, 458);
  ctx.lineTo(233, 536);
  ctx.moveTo(423, 458);
  ctx.lineTo(423, 536);
  ctx.moveTo(613, 458);
  ctx.lineTo(613, 536);
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#718194';
  ctx.font = font(400, 9);
  ctx.fillText('تاريخ الإصدار', 138, 470);
  ctx.fillStyle = '#152b49';
  ctx.font = font(700, 11);
  ctx.fillText(date, 138, 499, 174);

  ctx.fillStyle = '#718194';
  ctx.font = font(400, 9);
  ctx.fillText('رقم الشهادة', 328, 470);
  roundedRect(ctx, 244, 480, 168, 29, 8);
  ctx.fillStyle = '#e5eff5';
  ctx.fill();
  ctx.direction = 'ltr';
  ctx.fillStyle = '#152b49';
  ctx.font = '700 10px NotoSansLatin';
  ctx.fillText(certificate.serial, 328, 499, 158);
  ctx.direction = 'rtl';

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(518, 488, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(schoolSeal, 496, 466, 44, 44);
  ctx.strokeStyle = '#f0b94b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(518, 488, 29, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#718194';
  ctx.font = font(400, 9);
  ctx.direction = 'rtl';
  ctx.fillText('ختم المدرسة', 518, 530);

  ctx.fillStyle = '#718194';
  ctx.font = font(400, 9);
  ctx.fillText('جهة الإصدار', 680, 470);
  ctx.fillStyle = '#152b49';
  ctx.font = font(700, fitSize(ctx, certificate.school.name || 'مدارس الإخلاص الأهلية', 10, 104));
  ctx.fillText(certificate.school.name || 'مدارس الإخلاص الأهلية', 680, 491, 104);
  ctx.strokeStyle = '#8595a5';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(640, 514);
  ctx.lineTo(720, 514);
  ctx.stroke();
  ctx.fillStyle = '#8595a5';
  ctx.font = font(400, 8);
  ctx.fillText('الإدارة المدرسية', 680, 529);

  roundedRect(ctx, 741, 470, 52, 52, 7);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#dce5e9';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.drawImage(verificationCode, 746, 475, 42, 42);
  ctx.fillStyle = '#718194';
  ctx.font = font(400, 7);
  ctx.textAlign = 'center';
  ctx.fillText('تحقق رقمي', 767, 534);

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
