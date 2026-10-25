'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  BookOpen,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Highlighter,
  Loader2,
  Maximize2,
  Minimize2,
  PenLine,
  Printer,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CurriculumSubject } from '@/lib/curriculaData';
import { ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools';
import { apiClient } from '@/lib/api/client';
import { useRouter } from '@/i18n/routing';
import { deleteCurriculumDrawing, readCurriculumDrawings, saveCurriculumDrawing, type CurriculumDrawingRecord } from '@/lib/curriculum-workbook';

// ── Unit badge colours (cycling) ────────────────────────────────────────────
const UNIT_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
];

const COLOR_PALETTE = [
  { name: 'أسود', en: 'Black', value: '#0f172a' },
  { name: 'كحلي', en: 'Navy', value: '#203D52' },
  { name: 'أحمر', en: 'Red', value: '#dc2626' },
  { name: 'أخضر', en: 'Green', value: '#059669' },
  { name: 'بنفسجي', en: 'Purple', value: '#234A65' },
  { name: 'ذهبي', en: 'Gold', value: '#d97706' },
  { name: 'أزرق سماوي', en: 'Sky blue', value: '#4A687C' },
];

type Tool = 'view' | 'pen' | 'highlighter' | 'eraser';

export default function CurriculumInteractiveWorkbook({
  curriculum,
  canAssign = false,
  assignmentRange,
  studentAssignmentMode = false,
  drawingScope,
}: {
  curriculum: CurriculumSubject;
  canAssign?: boolean;
  assignmentRange?: { from: number; to: number };
  studentAssignmentMode?: boolean;
  drawingScope?: string;
}) {
  const isEnglish = useLocale() === 'en';
  const tr = (ar: string, en: string) => isEnglish ? en : ar;
  const router = useRouter();
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRootRef = useRef<HTMLDivElement>(null);
  const pageFrameRef = useRef<HTMLDivElement>(null);
  const pageNavRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const turnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [page, setPage] = useState(assignmentRange?.from ?? 1);
  const [pageInput, setPageInput] = useState(String(assignmentRange?.from ?? 1));
  const [pageTurnDirection, setPageTurnDirection] = useState<'forward' | 'backward' | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#0f172a');
  const [brush, setBrush] = useState(4);
  const [zoom, setZoom] = useState(100);
  const [fitToViewport, setFitToViewport] = useState(true);
  const [fitPageHeight, setFitPageHeight] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [printDrawingUrl, setPrintDrawingUrl] = useState('');
  const [showAssignment, setShowAssignment] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<Array<{ id: string; name: string; subjects: Array<{ id: string; name: string }> }>>([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<'AI_QUESTIONS' | 'BOOK_PAGES'>('AI_QUESTIONS');
  const [assignmentFrom, setAssignmentFrom] = useState(1);
  const [assignmentTo, setAssignmentTo] = useState(1);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignedPageWindow, setAssignedPageWindow] = useState<{ from: number; to: number } | null>(assignmentRange ?? null);

  const totalPages = curriculum.pageCount;
  const spreadStartPage = page % 2 === 0 ? page - 1 : page;
  const pageSpread = [spreadStartPage, spreadStartPage + 1].filter((pageNum) => {
    if (pageNum > totalPages) return false;
    if (!assignedPageWindow) return true;
    return pageNum >= assignedPageWindow.from && pageNum <= assignedPageWindow.to;
  });

  useEffect(() => () => {
    if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
  }, []);

  // Keep the global tutor aware of the textbook page currently open in this
  // reader. The API turns this validated page identity into the corresponding
  // first-party image before sending it to the vision model.
  useEffect(() => {
    const pageContext = {
      slug: curriculum.slug,
      title: curriculum.title,
      page,
      totalPages,
    };
    const pageWindow = window as typeof window & {
      __nexusCurriculumPageContext?: typeof pageContext;
    };
    pageWindow.__nexusCurriculumPageContext = pageContext;
    window.dispatchEvent(new CustomEvent('nexus:curriculum-page-context', { detail: pageContext }));

    return () => {
      if (pageWindow.__nexusCurriculumPageContext?.slug === curriculum.slug && pageWindow.__nexusCurriculumPageContext?.page === page) {
        delete pageWindow.__nexusCurriculumPageContext;
        window.dispatchEvent(new CustomEvent('nexus:curriculum-page-context', { detail: null }));
      }
    };
  }, [curriculum.slug, curriculum.title, page, totalPages]);

  const pageUnit = curriculum.units.find((unit) => assignmentFrom >= unit.fromPage && assignmentFrom <= unit.toPage);

  useEffect(() => {
    if (assignmentRange) {
      setAssignedPageWindow(assignmentRange);
      setPage(assignmentRange.from);
      setPageInput(String(assignmentRange.from));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('assigned') !== '1') return;
    const from = Number(params.get('from'));
    const to = Number(params.get('to'));
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > totalPages) return;
    setAssignedPageWindow({ from, to });
    setPage(from);
    setPageInput(String(from));
  }, [curriculum.slug, totalPages, assignmentRange?.from, assignmentRange?.to]);

  function matchesCurriculumSubject(name: string) {
    const value = name.toLocaleLowerCase('ar');
    const patterns: Record<string, RegExp> = {
      lughati: /لغتي|لغة عربية|عربي/,
      math: /رياض/,
      islamic: /إسلام|اسلام|شرعي/,
      science: /علوم/,
      english: /إنجليزي|انجليزي|إنجليزية|انجليزية|english/,
      'life-skills': /حياتية|أسرية|اسرية/,
      art: /فنية|فن/,
      quran: /قرآن|قران|تلاوة/,
    };
    return patterns[curriculum.slug]?.test(value) ?? value.includes(curriculum.title.toLocaleLowerCase('ar'));
  }

  const openAssignment = async () => {
    setShowAssignment(true);
    const currentUnit = curriculum.units.find((unit) => page >= unit.fromPage && page <= unit.toPage);
    setAssignmentFrom(page);
    setAssignmentTo(Math.min(totalPages, page + 2, currentUnit?.toPage || totalPages));
    if (teacherClasses.length || loadingClasses) return;
    setLoadingClasses(true); setAssignmentError('');
    try {
      const { data } = await apiClient.get<Array<{ id: string; name: string; subjects?: Array<{ id: string; name: string }> }>>('/workspace/teacher/classes');
      const available = (Array.isArray(data) ? data : []).map((item) => ({ ...item, subjects: (item.subjects || []).filter((subject) => matchesCurriculumSubject(subject.name)) })).filter((item) => item.subjects.length > 0);
      setTeacherClasses(available);
      setClassId(available[0]?.id || '');
      setSubjectId(available[0]?.subjects[0]?.id || '');
      if (!available.length) setAssignmentError(tr(`لا يوجد فصل مرتبط بمادة ${curriculum.title} في حسابك.`, `No class linked to ${curriculum.title} is assigned to your account.`));
    } catch { setAssignmentError(tr('تعذر تحميل فصولك وموادها.', 'Could not load your classes and subjects.')); }
    finally { setLoadingClasses(false); }
  };

  const selectedTeacherClass = teacherClasses.find((item) => item.id === classId);
  const assignPages = () => {
    if (!subjectId || assignmentFrom < 1 || assignmentTo < assignmentFrom || assignmentTo > totalPages || (assignmentMode === 'BOOK_PAGES' && assignmentTo - assignmentFrom + 1 > 30)) {
      setAssignmentError(tr('اختر المادة ونطاق صفحات صحيحًا من الكتاب.', 'Choose a subject and a valid page range from the textbook.'));
      return;
    }
    const selectedUnit = curriculum.units.find((unit) => assignmentFrom >= unit.fromPage && assignmentTo <= unit.toPage);
    if (assignmentMode === 'AI_QUESTIONS' && !selectedUnit) {
      setAssignmentError(tr('اختر الصفحات داخل وحدة واحدة حتى يقرأها مولد الأسئلة بدقة.', 'Choose pages within a single unit so the question generator can read them accurately.'));
      return;
    }
    setAssignmentLoading(true);
    const query = new URLSearchParams({ subjectId, curriculumSlug: curriculum.slug, pageFrom: String(assignmentFrom), pageTo: String(assignmentTo), assignmentMode });
    router.push(`/teacher/assignments/create?${query.toString()}`);
  };

  useEffect(() => {
    const measurePageSpace = () => {
      const frame = pageFrameRef.current;
      if (!frame) return;

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const frameTop = frame.getBoundingClientRect().top;
      const navHeight = pageNavRef.current?.getBoundingClientRect().height ?? 0;
      const frameStyle = window.getComputedStyle(frame);
      const verticalPadding =
        Number.parseFloat(frameStyle.paddingTop) + Number.parseFloat(frameStyle.paddingBottom);
      const availableHeight = Math.floor(
        viewportHeight - frameTop - navHeight - verticalPadding - 12,
      );
      const availableWidth = readerRootRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      const widthBoundHeight = availableWidth * (window.innerWidth >= 768 ? 0.62 : 1.24);

      setFitPageHeight(Math.max(140, Math.min(1000, availableHeight, widthBoundHeight)));
    };

    measurePageSpace();
    const observer = new ResizeObserver(measurePageSpace);
    if (readerRootRef.current) observer.observe(readerRootRef.current);
    if (pageFrameRef.current) observer.observe(pageFrameRef.current);
    window.addEventListener('resize', measurePageSpace);
    window.visualViewport?.addEventListener('resize', measurePageSpace);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measurePageSpace);
      window.visualViewport?.removeEventListener('resize', measurePageSpace);
    };
  }, [isFullscreen]);

  function pageSrc(pageNum: number) {
    return `/resources/curricula/${curriculum.slug}/page-${String(pageNum).padStart(3, '0')}.jpg`;
  }

  function drawingId(pageNum = page) {
    return `${curriculum.slug}${drawingScope ? `_${drawingScope}` : ''}_p${pageNum}`;
  }

  function getCanvasContext() {
    return canvasRef.current?.getContext('2d') ?? null;
  }

  function syncCanvasSize() {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const w = img.naturalWidth || img.clientWidth || 800;
    const h = img.naturalHeight || img.clientHeight || 1130;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function redrawSavedDrawing(pageNum = page) {
    const ctx = getCanvasContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    syncCanvasSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const saved = readCurriculumDrawings().find((d) => d.id === drawingId(pageNum));
    if (!saved?.dataUrl) { setSavedAt(''); return; }
    const tmp = new Image();
    tmp.onload = () => {
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      setSavedAt(new Date(saved.savedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    };
    tmp.src = saved.dataUrl;
  }

  // Preload adjacent pages
  useEffect(() => {
    const preload = (n: number) => { if (n >= 1 && n <= totalPages) { const i = new Image(); i.src = pageSrc(n); } };
    preload(page - 1);
    preload(page + 1);
    preload(page + 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Restore drawings on page change
  useEffect(() => {
    setPageInput(String(page));
    setLoadingPage(true);
    setImageLoaded(false);
    const t = setTimeout(() => { redrawSavedDrawing(page); setLoadingPage(false); }, 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPage(page + 1);
      else if (e.key === 'ArrowRight') goToPage(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function goToPage(n: number) {
    const lower = assignedPageWindow?.from ?? 1;
    const upper = assignedPageWindow?.to ?? totalPages;
    const c = Math.max(lower, Math.min(upper, n));
    if (c !== page) {
      setPageTurnDirection(c > page ? 'forward' : 'backward');
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      turnTimerRef.current = setTimeout(() => setPageTurnDirection(null), 420);
    }
    setPage(c);
    setPageInput(String(c));
  }

  function pageImageStyle(isCanvas = false): React.CSSProperties {
    const centered = isCanvas
      ? { position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
      : { position: 'relative' as const, margin: '0 auto' };
    return fitToViewport && fitPageHeight !== null
      ? { ...centered, height: `${fitPageHeight}px`, width: 'auto', maxWidth: '100%', minWidth: 0, display: 'block', objectFit: 'contain' }
      : { ...centered, width: `${zoom}%`, maxWidth: '900px', minWidth: '260px', height: 'auto', display: 'block', objectFit: 'contain' };
  }

  function getCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function applyToolStyle(ctx: CanvasRenderingContext2D) {
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brush * 4;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = brush * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brush;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function startDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === 'view') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getCanvasCoords(e);
    lastPointRef.current = pt;
    if (!pt) return;
    const ctx = getCanvasContext();
    if (!ctx) return;
    ctx.save();
    applyToolStyle(ctx);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (ctx.lineWidth || 4) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function onDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || tool === 'view') return;
    const cur = getCanvasCoords(e);
    const last = lastPointRef.current;
    if (!cur || !last) return;
    const ctx = getCanvasContext();
    if (!ctx) return;
    ctx.save();
    applyToolStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
    ctx.restore();
    lastPointRef.current = cur;
  }

  function endDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    persistCanvas();
  }

  function persistCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const now = new Date().toISOString();
    saveCurriculumDrawing({ id: drawingId(), slug: curriculum.slug, page, dataUrl, savedAt: now, ...(drawingScope ? { scope: drawingScope } : {}) });
    setSavedAt(new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  }

  function clearPage() {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    deleteCurriculumDrawing(drawingId());
    setSavedAt('');
  }

  function printCurrentPage() {
    setPrintDrawingUrl(canvasRef.current?.toDataURL('image/png') ?? '');
    window.setTimeout(() => window.print(), 80);
  }

  const activeUnit = curriculum.units.find((u) => page >= u.fromPage && page <= u.toPage);
  const printPages = assignedPageWindow
    ? Array.from({ length: assignedPageWindow.to - assignedPageWindow.from + 1 }, (_, index) => assignedPageWindow.from + index)
    : [page];

  return (
    <>
    <div className="report-print-root workbook-print-report" dir={isEnglish ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity
        title={curriculum.title}
        subtitle={`${curriculum.grade} · ${curriculum.term} · ${assignedPageWindow ? `${tr('صفحات الواجب', 'Homework pages')} ${assignedPageWindow.from}–${assignedPageWindow.to}` : `${tr('صفحة', 'Page')} ${page} ${tr('من', 'of')} ${totalPages}`}${activeUnit ? ` · ${activeUnit.title}` : ''}`}
      />
      {printPages.map((printPage, index) => <section key={printPage} className={`workbook-print-sheet${index === printPages.length - 1 ? ' workbook-print-sheet-last' : ''}`} aria-label={`${tr('صفحة', 'Page')} ${printPage} ${tr('من', 'of')} ${curriculum.title}`}>
        <div className="workbook-print-page">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pageSrc(printPage)} alt={`${curriculum.title} - صفحة ${printPage}`} />
          {printPage === page && printDrawingUrl ? <img className="workbook-print-annotations" src={printDrawingUrl} alt={tr('رسومات الطالب على الصفحة', 'Student annotations on the page')} /> : null}
        </div>
      </section>)}
      <ReportPrintFooter />
    </div>
    <div
      className={`workbook-interactive-root flex flex-col gap-4 transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-auto' : ''}`}
      dir={isEnglish ? 'ltr' : 'rtl'}
    >
      {/* ── Header ── */}
      <div
        className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${curriculum.color} 0%, ${curriculum.color}dd 100%)` }}
      >
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 text-white/90 px-3 py-1 text-[11px] font-black mb-2">
              {curriculum.badge}
            </span>
            <h1 className="text-2xl md:text-3xl font-black">{curriculum.title}</h1>
            <p className="text-xs font-bold text-white/80 mt-1">{curriculum.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="bg-white/15 px-3 py-1.5 rounded-xl">{curriculum.grade}</span>
            <span className="bg-white/15 px-3 py-1.5 rounded-xl">{curriculum.term}</span>
            <span className="bg-white/15 px-3 py-1.5 rounded-xl">{totalPages} {tr('صفحة', 'pages')}</span>
          </div>
        </div>
      </div>

      {/* ── Units Strip ── */}
      {!studentAssignmentMode && <div className="flex flex-wrap gap-2">
        {curriculum.units.map((unit, i) => (
          <button
            key={unit.title}
            onClick={() => goToPage(unit.fromPage)}
            disabled={Boolean(assignedPageWindow && (unit.toPage < assignedPageWindow.from || unit.fromPage > assignedPageWindow.to))}
            className={`book-unit-tab rounded-xl border px-3.5 py-2 text-xs font-black transition hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed ${UNIT_COLORS[i % UNIT_COLORS.length]} ${activeUnit?.title === unit.title ? 'ring-2 ring-offset-1 ring-slate-700 scale-[1.02]' : ''}`}
          >
            {unit.title}
            <span className="opacity-60 mr-1.5 text-[10px]">({unit.fromPage}–{unit.toPage})</span>
          </button>
        ))}
      </div>}

      {canAssign && !studentAssignmentMode && <section className="rounded-2xl border border-teal-200 bg-gradient-to-l from-teal-50 to-white p-4 shadow-sm">
        {!showAssignment ? <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-slate-900">{tr('حوّل صفحات الكتاب إلى واجب', 'Turn textbook pages into homework')}</h2><p className="mt-1 text-xs text-slate-600">{tr('اختر الفصل والصفحات؛ ثم أنشئ أسئلة من الصفحات نفسها بالذكاء الاصطناعي.', 'Choose a class and pages, then generate questions from those pages with AI.')}</p></div><button type="button" onClick={() => void openAssignment()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-teal-800"><ClipboardList size={16} />{tr('إسناد واجب من الكتاب', 'Assign textbook homework')}</button></div> : <div className="space-y-4">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-slate-900">{tr('تحديد صفحات الواجب', 'Select homework pages')}</h2><p className="mt-1 text-xs text-slate-600">{tr('اختر طريقة العمل، ثم حدّد الصفحات التي ستظهر للطالب.', 'Choose a homework type, then select the pages students will see.')}</p></div><button type="button" onClick={() => setShowAssignment(false)} aria-label={tr('إغلاق', 'Close')} className="grid size-8 place-items-center rounded-lg border bg-white text-slate-500 hover:bg-slate-50">×</button></div>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={tr('طريقة إعداد الواجب', 'Homework type')}>
            {([
              ['AI_QUESTIONS', tr('أسئلة بالذكاء الاصطناعي', 'AI-generated questions'), tr('إنشاء أسئلة من محتوى صفحات الكتاب وتصحيحها آليًا.', 'Generate questions from the textbook pages and grade them automatically.')],
            ['BOOK_PAGES', tr('إرسال صفحات الكتاب', 'Send textbook pages'), tr('تظهر الصفحات للطالب داخل الواجب، ويكتب الحل عليها ويرسله من المنصة دون رفع ملفات.', 'Students see the pages in their assignment, write their answers on them, and submit in the platform without uploading files.')],
            ] as const).map(([mode, title, description]) => <button key={mode} type="button" role="radio" aria-checked={assignmentMode === mode} onClick={() => { setAssignmentMode(mode); setAssignmentError(''); }} className={`rounded-xl border p-3 text-start transition ${assignmentMode === mode ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200 bg-white hover:border-teal-300'}`}><span className="block text-sm font-black text-slate-900">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></button>)}
          </div>
          {loadingClasses ? <p className="text-sm text-slate-600">{tr('جارٍ تحميل الفصول والمواد...', 'Loading classes and subjects…')}</p> : <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs font-bold text-slate-700"><span>{tr('الفصل', 'Class')}</span><select value={classId} onChange={(event) => { const next = teacherClasses.find((item) => item.id === event.target.value); setClassId(event.target.value); setSubjectId(next?.subjects[0]?.id || ''); setAssignmentError(''); }} className="h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium"><option value="">{tr('اختر الفصل', 'Select a class')}</option>{teacherClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="space-y-1 text-xs font-bold text-slate-700"><span>{tr('المادة', 'Subject')}</span><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={!selectedTeacherClass?.subjects.length} className="h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium"><option value="">{tr('اختر المادة', 'Select a subject')}</option>{selectedTeacherClass?.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            <label className="space-y-1 text-xs font-bold text-slate-700"><span>{tr('من صفحة', 'From page')}</span><input type="number" min={1} max={totalPages} value={assignmentFrom} onChange={(event) => { const next = Math.max(1, Math.min(totalPages, Number(event.target.value) || 1)); setAssignmentFrom(next); setAssignmentTo((current) => Math.max(next, Math.min(current, assignmentMode === 'AI_QUESTIONS' ? (curriculum.units.find((unit) => next >= unit.fromPage && next <= unit.toPage)?.toPage || totalPages) : Math.min(totalPages, next + 29)))); setAssignmentError(''); }} className="h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium" /></label>
            <label className="space-y-1 text-xs font-bold text-slate-700"><span>{tr('إلى صفحة (حتى', 'To page (up to')} {assignmentMode === 'AI_QUESTIONS' ? pageUnit?.toPage || totalPages : Math.min(totalPages, assignmentFrom + 29)} {tr('صفحة)', 'pages)')}</span><input type="number" min={assignmentFrom} max={assignmentMode === 'AI_QUESTIONS' ? pageUnit?.toPage || totalPages : Math.min(totalPages, assignmentFrom + 29)} value={assignmentTo} onChange={(event) => setAssignmentTo(Number(event.target.value))} className="h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium" /></label>
          </div>}
          {assignmentError && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">{assignmentError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-teal-100 pt-3"><p className="text-xs text-slate-600">{tr('الكتاب:', 'Book:')} <strong>{curriculum.title}</strong> · {tr('الصفحات', 'Pages')} {assignmentFrom}–{assignmentTo}</p><button type="button" disabled={loadingClasses || assignmentLoading || !subjectId} onClick={assignPages} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-50"><ClipboardList size={15} />{assignmentLoading ? tr('جارٍ فتح نموذج الواجب...', 'Opening the homework form…') : tr('متابعة لإعداد الواجب', 'Continue to set up homework')}</button></div>
        </div>}
      </section>}

      {/* ── Drawing Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {/* Tools */}
        <div className="flex items-center gap-1.5">
          {[
            { id: 'view', icon: <BookOpen size={16} />, label: tr('عرض فقط', 'View only') },
            { id: 'pen', icon: <PenLine size={16} />, label: tr('قلم', 'Pen') },
            { id: 'highlighter', icon: <Highlighter size={16} />, label: tr('تظليل', 'Highlighter') },
            { id: 'eraser', icon: <Eraser size={16} />, label: tr('ممحاة', 'Eraser') },
          ].map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => setTool(t.id as Tool)}
              className={`grid h-9 w-9 place-items-center rounded-xl border text-sm transition ${tool === t.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Color Palette */}
        {tool !== 'view' && tool !== 'eraser' && (
          <div className="flex items-center gap-1.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                title={isEnglish ? c.en : c.name}
                onClick={() => setColor(c.value)}
                className={`h-6 w-6 rounded-full border-2 transition ${color === c.value ? 'border-slate-800 scale-125' : 'border-transparent'}`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        )}

        {/* Brush size */}
        {tool === 'pen' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">{tr('حجم:', 'Size:')}</span>
            {[2, 4, 7, 12].map((s) => (
              <button
                key={s}
                onClick={() => setBrush(s)}
                className={`grid h-8 w-8 place-items-center rounded-xl border text-[10px] font-black transition ${brush === s ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => goToPage(page - 1)} disabled={page <= (assignedPageWindow?.from ?? 1)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition">
            <ChevronRight size={18} />
          </button>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
            <input
              type="number" min={assignedPageWindow?.from ?? 1} max={assignedPageWindow?.to ?? totalPages} value={pageInput}
              onChange={(e) => { setPageInput(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) goToPage(n); }}
              className="w-10 bg-transparent text-center text-sm font-black text-slate-900 outline-none"
            />
            <span className="text-xs font-bold text-slate-400">/ {totalPages}</span>
          </div>
          <button onClick={() => goToPage(page + 1)} disabled={page >= (assignedPageWindow?.to ?? totalPages)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition">
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setFitToViewport(false); setZoom((z) => Math.max(60, z - 15)); }}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-black text-slate-600 min-w-[48px] text-center">{fitToViewport ? tr('ملاءمة', 'Fit') : `${zoom}%`}</span>
          <button onClick={() => { setFitToViewport(false); setZoom((z) => Math.min(200, z + 15)); }}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
            <ZoomIn size={15} />
          </button>
          <button onClick={() => { setFitToViewport(true); setZoom(100); }} title={tr('احتواء الصفحة بالكامل', 'Fit page to view')}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Clear / Print / Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button onClick={clearPage} title={tr('مسح رسومات هذه الصفحة', 'Clear drawings on this page')}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 transition">
            <Eraser size={13} /> {tr('مسح', 'Clear')}
          </button>
          <button onClick={printCurrentPage}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
            <Printer size={15} />
          </button>
          <button onClick={() => setIsFullscreen((f) => !f)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── Saved indicator ── */}
      {savedAt && (
        <p className="text-xs font-bold text-emerald-700 text-center">
          ✅ {tr('تم حفظ رسوماتك تلقائياً — آخر حفظ:', 'Your drawings are saved automatically — last saved:')} {savedAt}
        </p>
      )}

      {/* ── Page Display with Canvas ── */}
      <div ref={readerRootRef} className="book-reader-stage overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
        <div className="book-reader-ribbon flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-xs font-black"><BookOpen size={15} />{tr('الكتاب المفتوح', 'Open book')}</span>
          <span className="text-[11px] font-bold text-slate-600">{activeUnit?.title || curriculum.title}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-slate-600">{page} / {totalPages}</span>
        </div>
        <div
          ref={pageFrameRef}
          className={`book-spread relative flex items-center justify-center p-3 sm:p-5 ${isEnglish ? 'book-spread-ltr' : 'book-spread-rtl'} ${pageSpread.length === 1 ? 'book-spread-single' : ''}`}
          style={fitToViewport && fitPageHeight !== null ? { minHeight: `${fitPageHeight + 40}px` } : { minHeight: 'min(70vh, 620px)' }}
        >
          {(loadingPage || !imageLoaded) && (
            <div className="book-loading-overlay absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-slate-600" size={30} />
              <p className="text-xs font-black text-slate-600">{tr('جاري تحميل صفحة', 'Loading page')} {page}...</p>
            </div>
          )}

          <div className="book-spread-pages relative z-[1] flex w-full items-center justify-center">
            {(pageSpread.length ? pageSpread : [page]).map((pageNum) => {
              const isActive = pageNum === page;
              return (
                <div
                  key={`${pageNum}-${isActive ? 'active' : 'preview'}`}
                  role={isActive ? undefined : 'button'}
                  tabIndex={isActive ? undefined : 0}
                  aria-label={isActive ? undefined : `${tr('انتقل إلى الصفحة', 'Select page')} ${pageNum}`}
                  onClick={() => { if (!isActive) goToPage(pageNum); }}
                  onKeyDown={(event) => {
                    if (!isActive && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      goToPage(pageNum);
                    }
                  }}
                  className={`book-leaf ${isActive ? 'book-leaf-active' : 'book-leaf-preview'} ${pageTurnDirection ? `book-page-turn-${pageTurnDirection}` : ''}`}
                  style={fitToViewport && fitPageHeight !== null ? { height: `${fitPageHeight}px` } : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={isActive ? imageRef : undefined}
                    key={`book-page-${pageNum}-${isActive ? 'active' : 'preview'}`}
                    src={pageSrc(pageNum)}
                    alt={`${curriculum.title} - ${tr('صفحة', 'page')} ${pageNum}`}
                    onLoad={isActive ? () => { setImageLoaded(true); syncCanvasSize(); redrawSavedDrawing(pageNum); } : undefined}
                    className="book-page-image select-none"
                    style={pageImageStyle()}
                  />

                  {isActive && imageLoaded && (
                    <canvas
                      ref={canvasRef}
                      className="book-page-canvas"
                      style={{
                        ...pageImageStyle(true),
                        cursor: tool === 'view' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
                        touchAction: 'none',
                        opacity: tool === 'view' ? 0.3 : 1,
                      }}
                      onPointerDown={startDrawing}
                      onPointerMove={onDraw}
                      onPointerUp={endDrawing}
                      onPointerLeave={endDrawing}
                    />
                  )}

                  {!isActive && <span className="book-page-preview-hint">{tr('اضغط الصفحة للكتابة عليها', 'Select this page to annotate')}</span>}
                  <span className={`book-page-number ${isActive ? 'book-page-number-active' : ''}`}>
                    {tr('صفحة', 'Page')} {pageNum}{isActive ? ` · ${tr('محددة', 'selected')}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom nav bar */}
        <div ref={pageNavRef} className="flex items-center justify-between border-t border-slate-200 bg-white p-3">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition">
            <ChevronRight size={15} /> {tr('السابقة', 'Previous')}
          </button>
          <span className="text-xs font-black text-slate-700">
            <span className="book-spread-desktop-label">{pageSpread.length > 1 ? `${tr('الصفحتان', 'Pages')} ${pageSpread[0]}–${pageSpread[pageSpread.length - 1]}` : `${tr('صفحة', 'Page')} ${page}`}</span>
            <span className="book-spread-mobile-label">{tr('صفحة', 'Page')} {page}</span> {tr('من', 'of')} {totalPages}
            {activeUnit && <span className="mr-2 text-slate-400 font-bold">— {activeUnit.title}</span>}
          </span>
          <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition">
            {tr('التالية', 'Next')} <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {/* ── Quick Jump Grid ── */}
      {!studentAssignmentMode && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-black text-slate-500">{tr('انتقل سريعاً إلى أي وحدة:', 'Jump to a unit:')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {curriculum.units.map((unit, i) => (
            <button
              key={unit.title}
              onClick={() => goToPage(unit.fromPage)}
              className={`rounded-xl border p-3 text-right transition hover:scale-[1.02] ${UNIT_COLORS[i % UNIT_COLORS.length]} ${activeUnit?.title === unit.title ? 'ring-2 ring-slate-700' : ''}`}
            >
              <p className="text-xs font-black leading-5">{unit.title}</p>
              <p className="mt-1 text-[11px] font-bold opacity-70">{tr('ص', 'Pages')} {unit.fromPage} – {unit.toPage}</p>
            </button>
          ))}
        </div>
      </div>}
    </div>
    </>
  );
}
