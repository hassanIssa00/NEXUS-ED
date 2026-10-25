import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import PDFDocument from 'pdfkit';
import { once } from 'node:events';
import { join } from 'node:path';
import { avatarDataUrlToBuffer } from '../upload/avatar-validation';

const WIDTH = 794;
const HEIGHT = 1123;
const SCALE = 2;
const ASSETS = join(__dirname, '../features/teacher-workspace/assets');

export type PlacementReportPdfData = {
  id: string;
  locale?: 'ar' | 'en';
  studentName: string;
  studentAvatar?: string | null;
  gradeLevel: number;
  assessmentKey: string;
  score: number;
  correctCount: number;
  questionCount: number;
  completedAt: string | Date;
  schoolName?: string;
  personLabel?: string;
  reportTitle?: string;
  answers: Array<{
    id: string;
    category: string;
    prompt: string;
    selectedAnswer: string | null;
    correctAnswer: string | null;
    isCorrect: boolean;
    explanation: string;
  }>;
};

type BrandAssets = {
  schoolSeal: Awaited<ReturnType<typeof loadImage>>;
  nexusLogo: Awaited<ReturnType<typeof loadImage>>;
};

type AnswerCard = {
  number: number;
  category: string;
  prompt: string[];
  selected: string[];
  correct: string[];
  explanation: string[];
  isCorrect: boolean;
  height: number;
};

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

function wrapText(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, value: string, maxWidth: number, textFont: string) {
  ctx.font = textFont;
  ctx.direction = 'rtl';
  const words = (value || '—').split(/\s+/).filter(Boolean);
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
  return lines.length ? lines : ['—'];
}

function gradeLabel(level: number, isEnglish: boolean) {
  if (level === 0) return isEnglish ? 'Kindergarten' : 'رياض الأطفال';
  if (level <= 6) return isEnglish ? `Grade ${level} · Primary` : `الصف ${level} الابتدائي`;
  if (level <= 9) return isEnglish ? `Grade ${level - 6} · Middle school` : `الصف ${level - 6} المتوسط`;
  return isEnglish ? `Grade ${level - 9} · Secondary` : `الصف ${level - 9} الثانوي`;
}

function assessmentLabel(key: string, isEnglish: boolean) {
  if (key === 'kg') return isEnglish ? 'Foundation assessment · Kindergarten' : 'الاختبار التأسيسي · رياض الأطفال';
  if (key === 'general') return isEnglish ? 'Foundation assessment · Grade 1' : 'الاختبار التأسيسي · الصف الأول';
  const grade = Number(key.replace(/^g/, ''));
  if (Number.isFinite(grade) && key.startsWith('g')) return isEnglish ? `Foundation assessment · Grade ${grade}` : `الاختبار التأسيسي · الصف ${grade}`;
  if (key === 'm1') return isEnglish ? 'Foundation assessment · Middle school' : 'الاختبار التأسيسي · المرحلة المتوسطة';
  if (key === 's1') return isEnglish ? 'Foundation assessment · Secondary school' : 'الاختبار التأسيسي · المرحلة الثانوية';
  return isEnglish ? 'Foundation assessment' : 'الاختبار التأسيسي';
}

function formattedDate(value: string | Date, isEnglish: boolean) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'ar-EG-u-ca-gregory', { dateStyle: 'medium' }).format(date);
}

function drawContain(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, image: Awaited<ReturnType<typeof loadImage>>, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function loadStudentAvatar(value?: string | null) {
  if (!value) return undefined;
  if (value.startsWith('data:')) {
    const buffer = avatarDataUrlToBuffer(value);
    return buffer ? loadImage(buffer).catch(() => undefined) : undefined;
  }
  const storageBase = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    const avatar = new URL(value);
    if (avatar.protocol !== 'https:' || avatar.username || avatar.password || avatar.port) return undefined;
    const allowedOrigins = new Set(['https://firebasestorage.googleapis.com', 'https://storage.googleapis.com']);
    if (storageBase) {
      const base = new URL(storageBase);
      if (base.protocol === 'https:') allowedOrigins.add(base.origin);
    }
    if (!allowedOrigins.has(avatar.origin)) return undefined;
    const response = await fetch(avatar, { redirect: 'error', signal: AbortSignal.timeout(8000) });
    const contentType = response.headers.get('content-type')?.split(';')[0].trim() || '';
    const length = Number(response.headers.get('content-length') || 0);
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType) || length > 5 * 1024 * 1024) return undefined;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) return undefined;
    return await loadImage(buffer);
  } catch {
    return undefined;
  }
}

function makeCardRows(data: PlacementReportPdfData, ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>): AnswerCard[] {
  return data.answers.map((answer, index) => {
    const prompt = wrapText(ctx, answer.prompt, WIDTH - 150, font(700, 12));
    const selected = wrapText(ctx, answer.selectedAnswer || 'لم تُسجل إجابة', WIDTH - 170, font(400, 11));
    const correct = wrapText(ctx, answer.correctAnswer || 'غير متاح', WIDTH - 170, font(400, 11));
    const explanation = answer.explanation ? wrapText(ctx, answer.explanation, WIDTH - 170, font(400, 10)) : [];
    const height = (explanation.length ? 121 : 107)
      + prompt.length * 18
      + selected.length * 17
      + correct.length * 17
      + explanation.length * 16;
    return { number: index + 1, category: answer.category || 'عام', prompt, selected, correct, explanation, isCorrect: answer.isCorrect, height };
  });
}

function paginateCards(cards: AnswerCard[]) {
  if (!cards.length) return [[]];
  const pages: AnswerCard[][] = [];
  let cursor = 0;

  while (cursor < cards.length) {
    const firstPage = pages.length === 0;
    const regularCapacity = firstPage ? 625 : 825;
    const finalCapacity = firstPage ? 500 : 675;
    const remainingHeight = cards.slice(cursor).reduce((total, card) => total + card.height + 10, -10);
    if (remainingHeight <= finalCapacity) {
      pages.push(cards.slice(cursor));
      cursor = cards.length;
      break;
    }

    const page: AnswerCard[] = [];
    let used = 0;
    while (cursor < cards.length) {
      const nextHeight = cards[cursor].height + 10;
      if (page.length && used + nextHeight > regularCapacity) break;
      page.push(cards[cursor]);
      used += nextHeight;
      cursor += 1;
    }
    pages.push(page);
  }

  const lastPageCapacity = pages.length === 1 ? 500 : 675;
  const lastPageHeight = pages[pages.length - 1].reduce((total, card) => total + card.height + 10, -10);
  if (lastPageHeight > lastPageCapacity) pages.push([]);
  return pages;
}

function drawHeader(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, data: PlacementReportPdfData, page: number, pageCount: number, assets: BrandAssets, studentAvatar?: Awaited<ReturnType<typeof loadImage>>) {
  const isEnglish = data.locale === 'en';
  ctx.fillStyle = '#f3f6f8';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(28, 20, WIDTH - 56, HEIGHT - 40);
  ctx.strokeStyle = '#b28b49';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(28, 20, WIDTH - 56, HEIGHT - 40);
  ctx.strokeStyle = '#0f8e78';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(35, 27, WIDTH - 70, HEIGHT - 54);

  ctx.fillStyle = '#12665c';
  ctx.fillRect(29, 21, WIDTH - 58, 143);
  ctx.fillStyle = '#10a88a';
  ctx.fillRect(29, 160, WIDTH - 58, 3);
  ctx.fillStyle = '#d6a84f';
  ctx.fillRect(29, 163, WIDTH - 58, 3);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(93, 89, 39, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(WIDTH - 91, 89, 39, 0, Math.PI * 2); ctx.fill();
  drawContain(ctx, assets.schoolSeal, 61, 57, 64, 64);
  drawContain(ctx, assets.nexusLogo, WIDTH - 128, 62, 75, 52);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = font(700, 16);
  ctx.fillText(data.schoolName || 'مدارس الإخلاص الأهلية', WIDTH / 2, 55, 430);
  ctx.fillStyle = '#dce9ef';
  ctx.font = font(400, 9);
  ctx.fillText(isEnglish ? 'Nexus EDU · Educational platform' : 'Nexus EDU · نكسس التعليمية', WIDTH / 2, 77);
  ctx.fillStyle = '#e8d4a8';
  ctx.font = font(700, 7);
  ctx.fillText(isEnglish ? 'Official report from school records' : 'تقرير إلكتروني من سجلات المدرسة', WIDTH / 2, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(700, 20);
  ctx.fillText(data.reportTitle || (isEnglish ? 'Full placement assessment answer report' : 'التقرير التفصيلي لإجابات الاختبار التأسيسي'), WIDTH / 2, 137, 480);

  if (page === 1) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dce5eb';
    ctx.beginPath(); ctx.roundRect(52, 180, WIDTH - 104, 155, 10); ctx.fill(); ctx.stroke();
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    const left = WIDTH - 72;
    ctx.fillStyle = '#5c7181';
    ctx.font = font(700, 9);
    ctx.fillText(`${data.personLabel || (isEnglish ? 'Student' : 'الطالب')}: ${data.studentName}`, left, 205, 540);
    ctx.fillText(`${isEnglish ? 'Grade' : 'الصف'}: ${gradeLabel(data.gradeLevel, isEnglish)}`, left, 230, 540);
    ctx.fillText(`${isEnglish ? 'Assessment' : 'الاختبار'}: ${assessmentLabel(data.assessmentKey, isEnglish)}`, left, 255, 540);
    ctx.fillText(`${isEnglish ? 'Completed' : 'تاريخ الإكمال'}: ${formattedDate(data.completedAt, isEnglish)}`, left, 280, 540);

    if (studentAvatar) {
      ctx.fillStyle = '#f3f7f9';
      ctx.strokeStyle = '#d7e0e7';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(66, 205, 74, 84, 8); ctx.fill(); ctx.stroke();
      drawContain(ctx, studentAvatar, 70, 209, 66, 76);
    }

    ctx.fillStyle = '#eef5f7';
    ctx.beginPath(); ctx.roundRect(68, 290, 145, 42, 8); ctx.fill();
    ctx.beginPath(); ctx.roundRect(222, 290, 145, 42, 8); ctx.fill();
    ctx.beginPath(); ctx.roundRect(376, 290, 145, 42, 8); ctx.fill();
    ctx.beginPath(); ctx.roundRect(530, 290, 195, 42, 8); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f8e78';
    ctx.font = font(700, 13);
    ctx.fillText(`${data.score}%`, 140, 316);
    ctx.fillText(`${data.correctCount} / ${data.questionCount}`, 294, 316);
    ctx.fillText(`${data.answers.filter((answer) => !answer.selectedAnswer).length}`, 448, 316);
    ctx.fillText(`NEXUS-${data.id.slice(-8).toUpperCase()}`, 627, 316);
    ctx.font = font(400, 7);
    ctx.fillStyle = '#5c7181';
    ctx.fillText(isEnglish ? 'Score' : 'النتيجة', 140, 302);
    ctx.fillText(isEnglish ? 'Correct answers' : 'إجابات صحيحة', 294, 302);
    ctx.fillText(isEnglish ? 'Unanswered' : 'بلا إجابة', 448, 302);
    ctx.fillText(isEnglish ? 'Report number' : 'رقم التقرير', 627, 302);
  }

  ctx.strokeStyle = '#d1dce4';
  ctx.beginPath(); ctx.moveTo(52, HEIGHT - 68); ctx.lineTo(WIDTH - 52, HEIGHT - 68); ctx.stroke();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#617787';
  ctx.font = font(400, 8);
  ctx.fillText(`${data.schoolName || (isEnglish ? 'Al-Ikhlas Private Schools' : 'مدارس الإخلاص الأهلية')} · ${formattedDate(new Date(), isEnglish)}`, WIDTH - 54, HEIGHT - 47);
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillText(isEnglish ? `Nexus EDU · Page ${page} of ${pageCount}` : `Nexus EDU · صفحة ${page} من ${pageCount}`, 54, HEIGHT - 47);

  if (page === pageCount) {
    const centerX = WIDTH / 2;
    const centerY = 1004;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#b28b49';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(centerX, centerY, 42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#0f8e78';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(centerX, centerY, 35, 0, Math.PI * 2); ctx.stroke();
    drawContain(ctx, assets.nexusLogo, centerX - 19, centerY - 25, 38, 33);
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f8e78';
    ctx.font = font(900, 6.5);
    ctx.fillText('NEXUS EDU', centerX, centerY + 14);
    ctx.direction = 'rtl';
    ctx.fillStyle = '#8d6b2f';
    ctx.font = font(700, 6);
    ctx.fillText(isEnglish ? 'PLATFORM SEAL' : 'ختم المنصة', centerX, centerY + 25);
    ctx.restore();
  }
}

function drawCard(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, card: AnswerCard, y: number, isEnglish: boolean) {
  const x = 52;
  const width = WIDTH - 104;
  ctx.fillStyle = '#fbfcfd';
  ctx.strokeStyle = '#dce5eb';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, width, card.height, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#edf3f6';
  ctx.beginPath(); ctx.roundRect(x + width - 132, y + 10, 113, 22, 11); ctx.fill();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#496579';
  ctx.font = font(700, 9);
  ctx.fillText(isEnglish ? `Question ${card.number} · ${card.category}` : `السؤال ${card.number} · ${card.category}`, x + width - 25, y + 25, width - 50);

  let currentY = y + 51;
  ctx.fillStyle = '#152a3a';
  ctx.font = font(700, 12);
  card.prompt.forEach((line) => { ctx.fillText(line, x + width - 24, currentY, width - 48); currentY += 18; });

  currentY += 4;
  ctx.fillStyle = card.isCorrect ? '#18794e' : '#a13f42';
  ctx.font = font(700, 9);
  ctx.fillText(isEnglish ? 'Student response:' : 'إجابة الطالب:', x + width - 24, currentY);
  ctx.fillStyle = '#243949';
  ctx.font = font(400, 11);
  currentY += 17;
  card.selected.forEach((line) => { ctx.fillText(line, x + width - 24, currentY, width - 48); currentY += 17; });

  currentY += 2;
  ctx.fillStyle = '#18794e';
  ctx.font = font(700, 9);
  ctx.fillText(isEnglish ? 'Correct answer:' : 'الإجابة الصحيحة:', x + width - 24, currentY);
  ctx.fillStyle = '#243949';
  ctx.font = font(400, 11);
  currentY += 17;
  card.correct.forEach((line) => { ctx.fillText(line, x + width - 24, currentY, width - 48); currentY += 17; });

  if (card.explanation.length) {
    currentY += 2;
    ctx.fillStyle = '#5c7181';
    ctx.font = font(700, 9);
    ctx.fillText(isEnglish ? 'Explanation:' : 'التوضيح:', x + width - 24, currentY);
    ctx.font = font(400, 10);
    currentY += 16;
    card.explanation.forEach((line) => { ctx.fillText(line, x + width - 24, currentY, width - 48); currentY += 16; });
  }
}

function renderPage(data: PlacementReportPdfData, pageCards: AnswerCard[], page: number, pageCount: number, assets: BrandAssets, studentAvatar?: Awaited<ReturnType<typeof loadImage>>) {
  const isEnglish = data.locale === 'en';
  const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  drawHeader(ctx, data, page, pageCount, assets, studentAvatar);
  let y = page === 1 ? 374 : 184;
  if (page === 1) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f8e78';
    ctx.font = font(700, 13);
    ctx.fillText(isEnglish ? 'Complete answer record' : 'سجل الإجابات الكامل', WIDTH - 54, y - 9);
    y += 12;
  }
  if (!pageCards.length && !data.answers.length) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#617787';
    ctx.font = font(400, 12);
    ctx.fillText(isEnglish ? 'No saved answer details are available for this assessment.' : 'لا توجد تفاصيل إجابات محفوظة لهذا الاختبار.', WIDTH / 2, y + 40);
  }
  pageCards.forEach((card) => {
    drawCard(ctx, card, y, isEnglish);
    y += card.height + 10;
  });
  return canvas.toBuffer('image/png');
}

export async function renderPlacementAssessmentPdf(data: PlacementReportPdfData): Promise<Buffer> {
  const assets = await loadAssets();
  const studentAvatar = await loadStudentAvatar(data.studentAvatar);
  const measureCanvas = createCanvas(WIDTH, HEIGHT);
  const cards = makeCardRows(data, measureCanvas.getContext('2d'));
  const pages = paginateCards(cards);
  const document = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `تقرير إجابات الاختبار - ${data.studentName}`,
      Author: data.schoolName || 'مدارس الإخلاص الأهلية',
      Subject: 'Nexus EDU placement assessment answers',
    },
  });
  const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => chunks.push(chunk));
  const completed = once(document, 'end').then(() => Buffer.concat(chunks));
  const pageData = pages.length ? pages : [[]];
  pageData.forEach((pageCards, index) => {
    if (index > 0) document.addPage({ size: 'A4', margin: 0 });
    const image = renderPage(data, pageCards, index + 1, pageData.length, assets, studentAvatar);
    document.image(image, 0, 0, { width: document.page.width, height: document.page.height });
  });
  document.end();
  return completed;
}
