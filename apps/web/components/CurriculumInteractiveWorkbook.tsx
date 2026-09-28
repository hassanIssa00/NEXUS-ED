'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
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

// ── Unit badge colours (cycling) ────────────────────────────────────────────
const UNIT_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
];

const COLOR_PALETTE = [
  { name: 'أسود', value: '#0f172a' },
  { name: 'كحلي', value: '#1e3a8a' },
  { name: 'أحمر', value: '#dc2626' },
  { name: 'أخضر', value: '#059669' },
  { name: 'بنفسجي', value: '#7c3aed' },
  { name: 'ذهبي', value: '#d97706' },
  { name: 'أزرق سماوي', value: '#0284c7' },
];

type Tool = 'view' | 'pen' | 'highlighter' | 'eraser';
const DRAWINGS_KEY = 'nexus.curriculumDrawings.v1';

type DrawingRecord = {
  id: string;
  slug: string;
  page: number;
  dataUrl: string;
  savedAt: string;
};

function readDrawings(): DrawingRecord[] {
  try {
    return JSON.parse(localStorage.getItem(DRAWINGS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveDrawing(record: DrawingRecord) {
  const all = readDrawings().filter((d) => d.id !== record.id);
  try {
    localStorage.setItem(DRAWINGS_KEY, JSON.stringify([record, ...all]));
  } catch {}
}

function deleteDrawing(id: string) {
  const next = readDrawings().filter((d) => d.id !== id);
  try {
    localStorage.setItem(DRAWINGS_KEY, JSON.stringify(next));
  } catch {}
}

export default function CurriculumInteractiveWorkbook({
  curriculum,
}: {
  curriculum: CurriculumSubject;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#0f172a');
  const [brush, setBrush] = useState(4);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);

  const totalPages = curriculum.pageCount;

  function pageSrc(pageNum: number) {
    return `/resources/curricula/${curriculum.slug}/page-${String(pageNum).padStart(3, '0')}.jpg`;
  }

  function drawingId(pageNum = page) {
    return `${curriculum.slug}_p${pageNum}`;
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
    const saved = readDrawings().find((d) => d.id === drawingId(pageNum));
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
    const c = Math.max(1, Math.min(totalPages, n));
    setPage(c);
    setPageInput(String(c));
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
    saveDrawing({ id: drawingId(), slug: curriculum.slug, page, dataUrl, savedAt: now });
    setSavedAt(new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  }

  function clearPage() {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    deleteDrawing(drawingId());
    setSavedAt('');
  }

  const activeUnit = curriculum.units.find((u) => page >= u.fromPage && page <= u.toPage);

  return (
    <div
      className={`flex flex-col gap-4 transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-auto' : ''}`}
      dir="rtl"
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
            <span className="bg-white/15 px-3 py-1.5 rounded-xl">{totalPages} صفحة</span>
          </div>
        </div>
      </div>

      {/* ── Units Strip ── */}
      <div className="flex flex-wrap gap-2">
        {curriculum.units.map((unit, i) => (
          <button
            key={unit.title}
            onClick={() => goToPage(unit.fromPage)}
            className={`rounded-xl border px-3.5 py-2 text-xs font-black transition hover:opacity-90 ${UNIT_COLORS[i % UNIT_COLORS.length]} ${activeUnit?.title === unit.title ? 'ring-2 ring-offset-1 ring-slate-700 scale-[1.02]' : ''}`}
          >
            {unit.title}
            <span className="opacity-60 mr-1.5 text-[10px]">({unit.fromPage}–{unit.toPage})</span>
          </button>
        ))}
      </div>

      {/* ── Drawing Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {/* Tools */}
        <div className="flex items-center gap-1.5">
          {[
            { id: 'view', icon: <BookOpen size={16} />, label: 'عرض فقط' },
            { id: 'pen', icon: <PenLine size={16} />, label: 'قلم' },
            { id: 'highlighter', icon: <Highlighter size={16} />, label: 'تظليل' },
            { id: 'eraser', icon: <Eraser size={16} />, label: 'ممحاة' },
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
                title={c.name}
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
            <span className="text-[11px] font-bold text-slate-500">حجم:</span>
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
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition">
            <ChevronRight size={18} />
          </button>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
            <input
              type="number" min={1} max={totalPages} value={pageInput}
              onChange={(e) => { setPageInput(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) goToPage(n); }}
              className="w-10 bg-transparent text-center text-sm font-black text-slate-900 outline-none"
            />
            <span className="text-xs font-bold text-slate-400">/ {totalPages}</span>
          </div>
          <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition">
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom((z) => Math.max(60, z - 15))}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-black text-slate-600 min-w-[36px] text-center">{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(200, z + 15))}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
            <ZoomIn size={15} />
          </button>
          <button onClick={() => setZoom(100)} title="إعادة ضبط"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Clear / Print / Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button onClick={clearPage} title="مسح رسومات هذه الصفحة"
            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 transition">
            <Eraser size={13} /> مسح
          </button>
          <button onClick={() => window.print()}
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
          ✅ تم حفظ رسوماتك تلقائياً — آخر حفظ: {savedAt}
        </p>
      )}

      {/* ── Page Display with Canvas ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[#f8f8f6] shadow-sm">
        <div className="relative flex items-center justify-center p-4 sm:p-6 min-h-[70vh]">
          {/* Loading indicator */}
          {(loadingPage || !imageLoaded) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f8f8f6]/90 z-10">
              <Loader2 className="animate-spin text-slate-600" size={30} />
              <p className="text-xs font-black text-slate-600">جاري تحميل صفحة {page}...</p>
            </div>
          )}

          {/* Book page image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            key={`book-page-${page}`}
            src={pageSrc(page)}
            alt={`${curriculum.title} - صفحة ${page}`}
            onLoad={() => { setImageLoaded(true); syncCanvasSize(); redrawSavedDrawing(page); }}
            className="absolute rounded-xl shadow-xl select-none"
            style={{ width: `${zoom}%`, maxWidth: '900px', minWidth: '260px', display: 'block', margin: '0 auto', position: 'relative' }}
          />

          {/* Drawing canvas overlay */}
          {imageLoaded && (
            <canvas
              ref={canvasRef}
              className="absolute rounded-xl"
              style={{
                width: `${zoom}%`,
                maxWidth: '900px',
                minWidth: '260px',
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
        </div>

        {/* Bottom nav bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white p-3">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition">
            <ChevronRight size={15} /> السابقة
          </button>
          <span className="text-xs font-black text-slate-700">
            صفحة {page} من {totalPages}
            {activeUnit && <span className="mr-2 text-slate-400 font-bold">— {activeUnit.title}</span>}
          </span>
          <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition">
            التالية <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {/* ── Quick Jump Grid ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-black text-slate-500">انتقل سريعاً إلى أي وحدة:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {curriculum.units.map((unit, i) => (
            <button
              key={unit.title}
              onClick={() => goToPage(unit.fromPage)}
              className={`rounded-xl border p-3 text-right transition hover:scale-[1.02] ${UNIT_COLORS[i % UNIT_COLORS.length]} ${activeUnit?.title === unit.title ? 'ring-2 ring-slate-700' : ''}`}
            >
              <p className="text-xs font-black leading-5">{unit.title}</p>
              <p className="mt-1 text-[11px] font-bold opacity-70">ص {unit.fromPage} – {unit.toPage}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
