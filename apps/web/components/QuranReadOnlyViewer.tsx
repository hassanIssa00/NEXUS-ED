'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Star,
  Download,
  Loader2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { CurriculumSubject } from '@/lib/curriculaData';

// Unit badge colours (cycling)
const UNIT_COLORS = [
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
];

export default function QuranReadOnlyViewer({
  curriculum,
}: {
  curriculum: CurriculumSubject;
}) {
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const totalPages = curriculum.pageCount || 72;
  const pdfUrl = `/resources/curricula/${curriculum.slug}/juz-amma.pdf`;

  // Pre-rendered fast page image
  const pageSrc = (n: number) =>
    `/resources/curricula/${curriculum.slug}/page-${String(n).padStart(3, '0')}.jpg`;

  const goToPage = useCallback(
    (n: number) => {
      const clamped = Math.max(1, Math.min(totalPages, n));
      setPage(clamped);
      setPageInput(String(clamped));
      setImageLoaded(false);
    },
    [totalPages],
  );

  const handlePageInput = (v: string) => {
    setPageInput(v);
    const n = parseInt(v, 10);
    if (!isNaN(n)) goToPage(n);
  };

  const clampZoom = (v: number) => Math.max(70, Math.min(180, v));

  // Preload next and previous pages for instant 0ms flips
  useEffect(() => {
    if (page < totalPages) {
      const nextImg = new Image();
      nextImg.src = pageSrc(page + 1);
    }
    if (page > 1) {
      const prevImg = new Image();
      prevImg.src = pageSrc(page - 1);
    }
    if (page + 2 <= totalPages) {
      const next2Img = new Image();
      next2Img.src = pageSrc(page + 2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPage(page + 1);
      } else if (e.key === 'ArrowRight') {
        goToPage(page - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, goToPage]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (diffX > 50) {
      goToPage(page + 1);
    } else if (diffX < -50) {
      goToPage(page - 1);
    }
  };

  // Active unit label
  const activeUnit = curriculum.units.find(
    (u) => page >= u.fromPage && page <= u.toPage,
  );

  return (
    <div
      className={`flex flex-col gap-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-auto' : ''}`}
      dir="rtl"
    >
      {/* ── Header ── */}
      <div
        className="rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #065f46 0%, #042f2e 100%)' }}
      >
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 text-[11px] font-black">
                <Star size={12} />
                {curriculum.badge}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-black text-white/90">
                <Sparkles size={11} className="text-amber-300" />
                تحميل فوري سريع (0.1 ثانية)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black">{curriculum.title}</h1>
            <p className="text-xs md:text-sm font-bold text-emerald-100/85 mt-1">{curriculum.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">{curriculum.grade}</span>
            <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">{totalPages} صفحة كاملة</span>
            <a
              href={pdfUrl}
              download="جزء-عم-المصحف-الشريف.pdf"
              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition"
              title="تحميل نسخة PDF الأصلية للطباعة"
            >
              <Download size={13} />
              <span>تحميل PDF</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Units Strip ── */}
      <div className="flex flex-wrap gap-2">
        {curriculum.units.map((unit, i) => (
          <button
            key={unit.title}
            onClick={() => goToPage(unit.fromPage)}
            className={`rounded-xl border px-3.5 py-2 text-xs font-black transition hover:opacity-90 ${
              UNIT_COLORS[i % UNIT_COLORS.length]
            } ${activeUnit?.title === unit.title ? 'ring-2 ring-offset-1 ring-emerald-700 font-extrabold scale-[1.02]' : ''}`}
          >
            <span>{unit.title}</span>
            <span className="opacity-75 mr-1.5 text-[10px]">({unit.fromPage} – {unit.toPage})</span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition"
            title="الصفحة السابقة (السهم الأيمن)"
          >
            <ChevronRight size={20} />
          </button>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => handlePageInput(e.target.value)}
              className="w-12 bg-transparent text-center text-sm font-black text-slate-900 outline-none"
            />
            <span className="text-xs font-bold text-slate-400">/ {totalPages}</span>
          </div>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition"
            title="الصفحة التالية (السهم الأيسر)"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Active unit badge */}
        {activeUnit && (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-black text-emerald-800">
            <BookOpen size={13} />
            {activeUnit.title}
          </span>
        )}

        {/* Zoom + Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => clampZoom(z - 15))}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
            title="تصغير"
          >
            <ZoomOut size={17} />
          </button>
          <span className="min-w-[42px] text-center text-xs font-black text-slate-700">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => clampZoom(z + 15))}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
            title="تكبير"
          >
            <ZoomIn size={17} />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
            title="إعادة ضبط الحجم"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            title={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>

      {/* ── Read-Only Quran Page Display (Instant Loading) ── */}
      <div
        className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Read-only notice */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50/80 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">📖</span>
            <p className="text-[11px] font-black text-amber-900">
              وضع القراءة والتلاوة فقط — محفوظ من الكتابة أو التعديل تقديساً لكتاب الله الكريم
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
            اسحب لليمين/اليسار للتقليب، أو استخدم الأسهم ⬅️ ➡️
          </span>
        </div>

        {/* Page Container */}
        <div className="relative flex items-center justify-center p-4 sm:p-8 bg-[#fdfbf7] min-h-[70vh] transition-all">
          {/* Subtle loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#fdfbf7]/80 z-10">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
              <p className="text-xs font-black text-emerald-800">جاري عرض صفحة {page}...</p>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`quran-page-${page}`}
            src={pageSrc(page)}
            alt={`القرآن الكريم - جزء عم - صفحة ${page}`}
            onLoad={() => setImageLoaded(true)}
            className="rounded-2xl shadow-xl transition-all duration-200 select-none pointer-events-none"
            style={{
              width: `${zoom}%`,
              maxWidth: '900px',
              minWidth: '280px',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        {/* Bottom Fast Page Switcher Bar */}
        <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-white">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <ChevronRight size={16} />
            <span>الصفحة السابقة</span>
          </button>

          <span className="text-xs font-black text-emerald-800">
            صفحة {page} من {totalPages}
          </span>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <span>الصفحة التالية</span>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* ── Quick Page Jump Grid ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <p className="mb-3 text-xs font-black text-slate-500">انتقل سريعاً إلى أي قسم في جزء عم:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {curriculum.units.map((unit, i) => (
            <button
              key={unit.title}
              onClick={() => goToPage(unit.fromPage)}
              className={`rounded-xl border p-3 text-right transition hover:scale-[1.02] shadow-sm ${UNIT_COLORS[i % UNIT_COLORS.length]} ${activeUnit?.title === unit.title ? 'ring-2 ring-emerald-700' : ''}`}
            >
              <p className="text-xs font-black leading-5">{unit.title}</p>
              <p className="mt-1 text-[11px] font-bold opacity-75">
                صفحة {unit.fromPage} – {unit.toPage}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
