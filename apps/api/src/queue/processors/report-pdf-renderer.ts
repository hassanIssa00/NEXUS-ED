import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import PDFDocument from 'pdfkit';
import { once } from 'node:events';
import { join } from 'node:path';
import { avatarDataUrlToBuffer } from '../../upload/avatar-validation';

const WIDTH = 794;
const HEIGHT = 1123;
const SCALE = 2;
const ASSETS = join(__dirname, '../../features/teacher-workspace/assets');

type ReportRow = { label: string; value: string };
type BrandAssets = { schoolSeal: Awaited<ReturnType<typeof loadImage>>; nexusLogo: Awaited<ReturnType<typeof loadImage>> };

let assetsPromise: Promise<BrandAssets> | undefined;

function loadAssets() {
  if (assetsPromise === undefined) {
    const arabicFont = GlobalFonts.registerFromPath(join(ASSETS, 'noto-sans-arabic.woff2'), 'NotoSansArabic');
    const latinFont = GlobalFonts.registerFromPath(join(ASSETS, 'noto-sans-latin.woff2'), 'NotoSansLatin');
    if (!arabicFont || !latinFont) throw new Error('Nexus report fonts could not be loaded.');
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

function safeText(value: unknown): string {
  if (value instanceof Date) return new Intl.DateTimeFormat('ar-SA-u-ca-gregory').format(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '—';
  return '';
}

const FIELD_LABELS: Record<string, string> = {
  student: 'الطالب', studentName: 'اسم الطالب', name: 'الاسم', email: 'البريد الإلكتروني',
  class: 'الفصل', className: 'الفصل', subject: 'المادة', subjectName: 'المادة',
  date: 'التاريخ', createdAt: 'تاريخ الإنشاء', completedAt: 'تاريخ الإكمال',
  status: 'الحالة', attendance: 'الحضور', grade: 'الدرجة', score: 'النتيجة',
  maxScore: 'الدرجة النهائية', correctCount: 'الإجابات الصحيحة', questionCount: 'عدد الأسئلة',
  title: 'العنوان', description: 'التفاصيل', school: 'المدرسة', issuer: 'جهة الإصدار',
  content: 'المحتوى', response: 'الرد', body: 'التفاصيل',
};

function labelFor(key: string) {
  return FIELD_LABELS[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
}

function splitLongText(value: string, limit = 700) {
  if (value.length <= limit) return [value || '—'];
  const parts: string[] = [];
  let remaining = value;
  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf('\n', limit);
    const wordBoundary = remaining.lastIndexOf(' ', limit);
    if (wordBoundary > Math.floor(limit * 0.6)) splitAt = Math.max(splitAt, wordBoundary);
    if (splitAt <= 0) splitAt = limit;
    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts.length ? parts : ['—'];
}

function flatten(value: unknown, label: string, rows: ReportRow[], depth = 0) {
  if (rows.length >= 300 || depth > 5 || /password|token|secret|credential|authorization|avatar|photo|image/i.test(label)) return;
  const text = safeText(value);
  if (text !== '') {
    for (const part of splitLongText(text)) {
      if (rows.length >= 300) break;
      rows.push({ label: label || 'بيانات', value: part });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const itemLabel = `${label} · ${index + 1}`;
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.entries(item as Record<string, unknown>).forEach(([key, itemValue]) => flatten(itemValue, `${itemLabel} · ${labelFor(key)}`, rows, depth + 1));
      } else {
        flatten(item, itemLabel, rows, depth + 1);
      }
    });
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const keyLabel = labelFor(key);
      flatten(child, label ? `${label} · ${keyLabel}` : keyLabel, rows, depth + 1);
    });
  }
}

function wrapText(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, value: string, maxWidth: number, textFont: string) {
  ctx.font = textFont;
  ctx.direction = 'rtl';
  const lines: string[] = [];
  for (const paragraph of value.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
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
  }
  return lines.length ? lines : ['—'];
}

function reportTitle(type: string) {
  const titles: Record<string, string> = {
    'student-certificate': 'تقرير شهادة الطالب',
    'attendance-report': 'تقرير الحضور',
    'grades-report': 'تقرير الدرجات',
  };
  return titles[type] || 'تقرير مدرسي';
}

function buildPages(rows: ReportRow[], ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>) {
  const pages: Array<Array<{ labelLines: string[]; valueLines: string[]; height: number }>> = [[]];
  let y = 260;
  const bottom = HEIGHT - 157;
  for (const row of rows) {
    const labelLines = wrapText(ctx, row.label, WIDTH - 104, font(700, 10));
    const valueLines = wrapText(ctx, row.value, WIDTH - 104, font(400, 12));
    const height = Math.max(60, 23 + labelLines.length * 15 + valueLines.length * 19);
    if (y + height > bottom && pages[pages.length - 1].length > 0) {
      pages.push([]);
      y = 260;
    }
    pages[pages.length - 1].push({ labelLines, valueLines, height });
    y += height + 8;
  }
  return pages;
}

function drawContain(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, image: Awaited<ReturnType<typeof loadImage>>, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function loadStudentAvatar(value: unknown): Promise<Awaited<ReturnType<typeof loadImage>> | undefined> {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  if (value.startsWith('data:')) {
    const bytes = avatarDataUrlToBuffer(value);
    return bytes ? loadImage(bytes).catch(() => undefined) : undefined;
  }
  try {
    const avatar = new URL(value);
    if (avatar.protocol !== 'https:' || avatar.username || avatar.password || avatar.port) return undefined;
    const allowedOrigins = new Set(['https://firebasestorage.googleapis.com', 'https://storage.googleapis.com']);
    const baseUrl = process.env.SUPABASE_URL?.trim();
    if (baseUrl) {
      const base = new URL(baseUrl);
      if (base.protocol === 'https:') allowedOrigins.add(base.origin);
    }
    if (!allowedOrigins.has(avatar.origin)) return undefined;
    const response = await fetch(avatar, { redirect: 'error', signal: AbortSignal.timeout(8000) });
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    const length = Number(response.headers.get('content-length') || 0);
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType || '') || length > 5 * 1024 * 1024) return undefined;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) return undefined;
    return await loadImage(bytes);
  } catch {
    return undefined;
  }
}

function renderPage(title: string, schoolName: string, studentName: string, studentAvatar: Awaited<ReturnType<typeof loadImage>> | undefined, rows: Array<{ labelLines: string[]; valueLines: string[]; height: number }>, page: number, totalPages: number, assets: BrandAssets) {
  const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#f4f7f9';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(30, 24, WIDTH - 60, HEIGHT - 48);
  ctx.strokeStyle = '#d6a84f';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 24, WIDTH - 60, HEIGHT - 48);
  ctx.strokeStyle = '#0f8e78';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(36, 30, WIDTH - 72, HEIGHT - 60);

  ctx.fillStyle = '#12665c';
  ctx.fillRect(31, 25, WIDTH - 62, 144);
  ctx.fillStyle = '#16a085';
  ctx.fillRect(31, 163, WIDTH - 62, 3);
  ctx.fillStyle = '#d6a84f';
  ctx.fillRect(31, 166, WIDTH - 62, 3);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(93, 94, 44, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(WIDTH - 92, 94, 44, 0, Math.PI * 2); ctx.fill();
  drawContain(ctx, assets.schoolSeal, 57, 58, 72, 72);
  drawContain(ctx, assets.nexusLogo, WIDTH - 138, 66, 92, 56);
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5d78d';
  ctx.font = font(700, 7);
  ctx.fillText('الختم المدرسي', 93, 151);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = font(700, 17);
  ctx.fillText(schoolName, WIDTH / 2, 67, 430);
  ctx.fillStyle = '#d9f2ec';
  ctx.font = font(400, 10);
  ctx.fillText('Nexus EDU · نكسس التعليمية', WIDTH / 2, 90);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(700, 21);
  ctx.fillText(title, WIDTH / 2, 128, 460);

  ctx.fillStyle = '#eef4f6';
  ctx.beginPath(); ctx.roundRect(54, 183, WIDTH - 108, 62, 10); ctx.fill();
  if (studentAvatar) {
    ctx.save();
    ctx.beginPath(); ctx.arc(WIDTH - 91, 214, 23, 0, Math.PI * 2); ctx.clip();
    const scale = Math.min(46 / studentAvatar.width, 46 / studentAvatar.height);
    const avatarWidth = studentAvatar.width * scale;
    const avatarHeight = studentAvatar.height * scale;
    ctx.drawImage(studentAvatar, WIDTH - 91 - avatarWidth / 2, 214 - avatarHeight / 2, avatarWidth, avatarHeight);
    ctx.restore();
  } else {
    ctx.fillStyle = '#d9e5eb';
    ctx.beginPath(); ctx.arc(WIDTH - 91, 214, 23, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#476577';
    ctx.font = font(700, 17);
    ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.fillText(studentName.slice(0, 1) || title.slice(0, 1) || 'ت', WIDTH - 91, 220);
  }
  ctx.direction = 'rtl'; ctx.textAlign = 'right';
  ctx.fillStyle = '#567084'; ctx.font = font(700, 9);
  ctx.fillText(studentName ? 'ملف الطالب' : 'بيانات التقرير', WIDTH - 132, 207);
  ctx.fillStyle = '#172a3a'; ctx.font = font(700, 13);
  ctx.fillText(studentName || title || 'تقرير مدرسي', WIDTH - 132, 228, WIDTH - 240);

  let y = 260;
  for (const row of rows) {
    ctx.fillStyle = '#f8fafb';
    ctx.strokeStyle = '#dce5eb';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(54, y, WIDTH - 108, row.height, 8); ctx.fill(); ctx.stroke();
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.font = font(700, 10);
    ctx.fillStyle = '#567084';
    row.labelLines.forEach((line, index) => ctx.fillText(line, WIDTH - 76, y + 22 + (index * 14), WIDTH - 152));
    const valueTop = y + 22 + row.labelLines.length * 14;
    ctx.font = font(400, 12);
    ctx.fillStyle = '#172a3a';
    row.valueLines.forEach((line, index) => ctx.fillText(line, WIDTH - 76, valueTop + 16 + (index * 18), WIDTH - 152));
    y += row.height + 8;
  }

  ctx.strokeStyle = '#cbd5de';
  ctx.beginPath(); ctx.moveTo(54, HEIGHT - 81); ctx.lineTo(WIDTH - 54, HEIGHT - 81); ctx.stroke();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#526a7a';
  ctx.font = font(400, 9);
  const issuedAt = new Intl.DateTimeFormat('ar-EG-u-ca-gregory').format(new Date());
  ctx.fillText(`مدارس الإخلاص الأهلية · ${issuedAt}`, WIDTH - 55, HEIGHT - 60);
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillText(`Nexus EDU · Page ${page} of ${totalPages}`, 55, HEIGHT - 60);
  if (page === totalPages) {
    const centerX = WIDTH / 2;
    const centerY = 1003;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d6a84f';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(centerX, centerY, 29, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#0f8e78';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(centerX, centerY, 24, 0, Math.PI * 2); ctx.stroke();
    drawContain(ctx, assets.nexusLogo, centerX - 14, centerY - 15, 28, 22);
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f8e78';
    ctx.font = font(900, 5.5);
    ctx.fillText('NEXUS EDU', centerX, centerY + 14);
    ctx.direction = 'rtl';
    ctx.fillStyle = '#8d6b2f';
    ctx.font = font(700, 5.2);
    ctx.fillText('ختم المنصة', centerX, centerY + 22);
    ctx.restore();
  }
  return canvas.toBuffer('image/png');
}

export async function renderQueuedReportPdf(type: string, data: Record<string, unknown>): Promise<Buffer> {
  const assets = await loadAssets();
  const rows: ReportRow[] = [];
  const { reportTitle: suppliedTitle, ...reportData } = data;
  flatten(reportData, '', rows);
  if (!rows.length) rows.push({ label: 'حالة التقرير', value: 'لا توجد بيانات تفصيلية مرفقة بهذا التقرير.' });
  const school = data.school && typeof data.school === 'object' ? (data.school as Record<string, unknown>).name : undefined;
  const schoolName = safeText(data.schoolName || school) || 'مدارس الإخلاص الأهلية';
  const studentInfo = data.studentInfo && typeof data.studentInfo === 'object' ? data.studentInfo as Record<string, unknown> : undefined;
  const student = data.student && typeof data.student === 'object' ? data.student as Record<string, unknown> : undefined;
  const studentName = safeText(data.studentName || studentInfo?.name || student?.name);
  const studentAvatar = await loadStudentAvatar(data.studentAvatar || studentInfo?.avatar || student?.avatar || data.avatar);
  const measureCanvas = createCanvas(WIDTH, HEIGHT);
  const ctx = measureCanvas.getContext('2d');
  const title = safeText(suppliedTitle) || reportTitle(type);
  const pages = buildPages(rows, ctx);

  const document = new PDFDocument({ size: 'A4', margin: 0, info: { Title: title, Author: schoolName, Subject: 'Nexus EDU school report' } });
  const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => chunks.push(chunk));
  const completed = once(document, 'end').then(() => Buffer.concat(chunks));
  pages.forEach((pageRows, index) => {
    if (index > 0) document.addPage({ size: 'A4', margin: 0 });
    const image = renderPage(title, schoolName, studentName, studentAvatar, pageRows, index + 1, pages.length, assets);
    document.image(image, 0, 0, { width: document.page.width, height: document.page.height });
  });
  document.end();
  return completed;
}
