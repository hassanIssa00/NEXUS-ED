export const CURRICULUM_DRAWINGS_KEY = 'nexus.curriculumDrawings.v1';

export type CurriculumDrawingRecord = {
  id: string;
  slug: string;
  page: number;
  dataUrl: string;
  savedAt: string;
  scope?: string;
};

export function readCurriculumDrawings(): CurriculumDrawingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CURRICULUM_DRAWINGS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is CurriculumDrawingRecord => Boolean(
      item && typeof item === 'object' && typeof item.id === 'string' &&
      typeof item.slug === 'string' && Number.isInteger(item.page) &&
      typeof item.dataUrl === 'string' && typeof item.savedAt === 'string' &&
      (item.scope === undefined || typeof item.scope === 'string'),
    )) : [];
  } catch {
    return [];
  }
}

export function saveCurriculumDrawing(record: CurriculumDrawingRecord) {
  const all = readCurriculumDrawings().filter((drawing) => drawing.id !== record.id);
  try {
    localStorage.setItem(CURRICULUM_DRAWINGS_KEY, JSON.stringify([record, ...all]));
  } catch {
    // Keep the drawing usable in the current canvas if browser storage is full.
  }
}

export function deleteCurriculumDrawing(id: string) {
  const next = readCurriculumDrawings().filter((drawing) => drawing.id !== id);
  try {
    localStorage.setItem(CURRICULUM_DRAWINGS_KEY, JSON.stringify(next));
  } catch {
    // The canvas is already cleared; a later page load can still be used.
  }
}

export function getMissingCurriculumDrawingPages(slug: string, from: number, to: number, scope?: string) {
  const savedPages = new Set(readCurriculumDrawings()
    .filter((drawing) => drawing.slug === slug && drawing.scope === scope && drawing.dataUrl.length > 0)
    .map((drawing) => drawing.page));
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index)
    .filter((page) => !savedPages.has(page));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('تعذر تحميل إحدى صفحات الكتاب لإرسالها.'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('تعذر تجهيز صور صفحات الحل.')), 'image/jpeg', 0.92);
  });
}

export async function createSolvedCurriculumPageFiles(slug: string, from: number, to: number, scope?: string): Promise<File[]> {
  const drawings = readCurriculumDrawings();
  const files: File[] = [];

  for (let page = from; page <= to; page += 1) {
    const basePage = await loadImage(`/resources/curricula/${encodeURIComponent(slug)}/page-${String(page).padStart(3, '0')}.jpg`);
    const canvas = document.createElement('canvas');
    canvas.width = basePage.naturalWidth;
    canvas.height = basePage.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذر تجهيز صورة صفحة الكتاب.');
    context.drawImage(basePage, 0, 0, canvas.width, canvas.height);

    const drawing = drawings.find((item) => item.slug === slug && item.page === page && item.scope === scope);
    if (drawing?.dataUrl) {
      const overlay = await loadImage(drawing.dataUrl);
      context.drawImage(overlay, 0, 0, canvas.width, canvas.height);
    }

    const blob = await canvasToBlob(canvas);
    files.push(new File([blob], `حل-${slug}-صفحة-${page}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
  }

  return files;
}

export function clearCurriculumDrawings(slug: string, from: number, to: number, scope?: string) {
  const selectedPages = new Set(Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index));
  const remaining = readCurriculumDrawings().filter((drawing) => drawing.slug !== slug || drawing.scope !== scope || !selectedPages.has(drawing.page));
  try {
    localStorage.setItem(CURRICULUM_DRAWINGS_KEY, JSON.stringify(remaining));
  } catch {
    // A successful submission should not fail because the browser could not clear its cache.
  }
}
