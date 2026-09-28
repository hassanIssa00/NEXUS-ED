'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coffee,
  ChevronLeft,
  Sun,
  Moon,
  Compass,
} from 'lucide-react';
import { CLASS_SCHEDULE, SCHOOL_TIMETABLE } from '@/lib/nexusDataBridge';

interface LiveDayScheduleProps {
  role?: 'student' | 'parent';
  studentName?: string;
  className?: string;
  scheduleUrl?: string;
}

const DAY_NAMES = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const SUBJECT_ICONS: Record<string, string> = {
  'اللغة العربية': '📖',
  'لغتي الجميلة': '📖',
  'القرآن الكريم': '📿',
  'القرآن الكريم وتلاوته': '📿',
  'التربية الإسلامية': '🕌',
  'الدراسات الإسلامية': '🕌',
  'الرياضيات': '🔢',
  'العلوم': '🔬',
  'العلوم الطبيعية': '🔬',
  'اللغة الإنجليزية': '🔤',
  'فن': '🎨',
  'التربية الفنية': '🎨',
  'التربية البدنية': '⚽',
};

// Period timing in minutes from 00:00
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

export default function LiveDaySchedule({
  role = 'student',
  studentName = 'أحمد فيصل الغامدي',
  className = 'الصف الأول الابتدائي — الفئة (أ)',
  scheduleUrl = role === 'parent' ? '/parent/schedule' : '/student/schedule',
}: LiveDayScheduleProps) {
  // Current time state that ticks every 15 seconds
  const [now, setNow] = useState<Date>(() => new Date());
  const [previewDay, setPreviewDay] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri or Sat in Saudi Arabia

  // Effective day to show (Sunday by default if weekend, or preview selected)
  const activeDayIndex = previewDay !== null ? previewDay : isWeekend ? 0 : dayOfWeek;
  const isViewingToday = !isWeekend && (previewDay === null || previewDay === dayOfWeek);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Periods for the active day from CLASS_SCHEDULE (0 = Sun .. 4 = Thu)
  const periodsForDay = useMemo(() => {
    const classDayIdx = activeDayIndex <= 4 ? activeDayIndex : 0;
    return CLASS_SCHEDULE.filter((p) => p.dayOfWeek === classDayIdx).sort(
      (a, b) => a.periodNumber - b.periodNumber
    );
  }, [activeDayIndex]);

  // Combined day items: periods + morning assembly + breakfast break + prayer
  const fullDayTimeline = useMemo(() => {
    const items: Array<{
      id: string;
      order: number;
      name: string;
      teacher?: string;
      startTime: string;
      endTime: string;
      startMin: number;
      endMin: number;
      emoji: string;
      isPeriod: boolean;
      periodNumber?: number;
      type: 'assembly' | 'period' | 'break' | 'prayer' | 'dismissal';
    }> = [];

    // 1. Morning assembly
    items.push({
      id: 'assembly',
      order: 0,
      name: 'طابور الصباح والنشيد الوطني',
      startTime: '06:45',
      endTime: '07:00',
      startMin: timeToMinutes('06:45'),
      endMin: timeToMinutes('07:00'),
      emoji: '🫡',
      isPeriod: false,
      type: 'assembly',
    });

    // 2. Add periods and intervals
    periodsForDay.forEach((p) => {
      // Before period 4 (09:15 - 09:30) is the breakfast break
      if (p.periodNumber === 4 && !items.some((i) => i.id === 'break-breakfast')) {
        items.push({
          id: 'break-breakfast',
          order: 3.5,
          name: 'استراحة الفطور والوجبة الصحية',
          startTime: '09:15',
          endTime: '09:30',
          startMin: timeToMinutes('09:15'),
          endMin: timeToMinutes('09:30'),
          emoji: '🥪',
          isPeriod: false,
          type: 'break',
        });
      }

      items.push({
        id: `period-${p.periodNumber}`,
        order: p.periodNumber,
        name: p.subjectName,
        teacher: p.teacherName || 'د. إسماعيل عيسى',
        startTime: p.startTime,
        endTime: p.endTime,
        startMin: timeToMinutes(p.startTime),
        endMin: timeToMinutes(p.endTime),
        emoji: SUBJECT_ICONS[p.subjectName] || '📚',
        isPeriod: true,
        periodNumber: p.periodNumber,
        type: 'period',
      });
    });

    // 3. Dhuhr prayer
    items.push({
      id: 'dhuhr-prayer',
      order: 8,
      name: 'صلاة الظهر جماعة بالمسجد المدرسي',
      startTime: '12:30',
      endTime: '12:40',
      startMin: timeToMinutes('12:30'),
      endMin: timeToMinutes('12:40'),
      emoji: '🕌',
      isPeriod: false,
      type: 'prayer',
    });

    // Sort by startMin
    return items.sort((a, b) => a.startMin - b.startMin);
  }, [periodsForDay]);

  // Calculate status for each item
  const timelineWithStatus = useMemo(() => {
    return fullDayTimeline.map((item) => {
      if (!isViewingToday) {
        return { ...item, status: 'scheduled' as const, remainingMin: 0 };
      }

      if (currentMinutes < item.startMin) {
        return { ...item, status: 'upcoming' as const, remainingMin: item.startMin - currentMinutes };
      } else if (currentMinutes >= item.startMin && currentMinutes < item.endMin) {
        return { ...item, status: 'active' as const, remainingMin: item.endMin - currentMinutes };
      } else {
        return { ...item, status: 'finished' as const, remainingMin: 0 };
      }
    });
  }, [fullDayTimeline, isViewingToday, currentMinutes]);

  const activeItem = timelineWithStatus.find((i) => i.status === 'active');
  const allFinished = isViewingToday && currentMinutes >= timeToMinutes('12:40');
  const notStartedYet = isViewingToday && currentMinutes < timeToMinutes('06:45');

  // Time formatted in Arabic
  const formattedCurrentTime = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-gray-900 dark:text-white text-base">
                جدول حصص اليوم الدراسي
              </h3>
              {isViewingToday && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  مباشر لايف
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-medium">
              {DAY_NAMES[dayOfWeek]} • الساعة الآن {formattedCurrentTime}
            </p>
          </div>
        </div>

        <Link
          href={scheduleUrl}
          className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-1 group transition"
        >
          <span>الجدول الأسبوعي</span>
          <ChevronLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-1" />
        </Link>
      </div>

      {/* ─── WEEKEND NOTICE BANNER (الجمعة أو السبت) ─── */}
      {isWeekend && (
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 p-4 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🌴</span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black text-xs sm:text-sm">
                  عطلة نهاية الأسبوع الرسمية ({DAY_NAMES[dayOfWeek]})
                </h4>
                <span className="text-[10px] font-bold bg-amber-200/60 dark:bg-amber-500/20 px-2 py-0.5 rounded-md">
                  إجازة رسمية
                </span>
              </div>
              <p className="text-xs mt-1 text-amber-800/90 dark:text-amber-200/80 leading-relaxed font-medium">
                اليوم لا توجد حصص دراسية مجدولة. نتمنى للبطل{' '}
                <span className="font-bold underline">{studentName}</span> وأسرته الكريمة إجازة سعيدة وموفقة! 🏖️
              </p>
              <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-bold flex items-center gap-1 text-amber-950 dark:text-amber-100">
                  <Clock className="w-3 h-3" /> يبدأ الأسبوع الدراسي القادم يوم الأحد الساعة 06:45 ص
                </span>
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  (معروض أدناه جدول يوم الأحد للاستعداد والتجهيز 👇)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIVE DAY STATUS SUMMARY ─── */}
      {!isWeekend && (
        <div className="mb-3">
          {activeItem && (
            <div className="rounded-2xl bg-violet-600 text-white p-3.5 shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">{activeItem.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black animate-pulse">
                      جارية الآن 🔴
                    </span>
                    <p className="font-black text-sm truncate">{activeItem.name}</p>
                  </div>
                  <p className="text-[11px] text-violet-100 mt-0.5">
                    {activeItem.isPeriod && `الحصة ${activeItem.periodNumber} • `}
                    {activeItem.teacher && `${activeItem.teacher} • `}
                    من {activeItem.startTime} حتى {activeItem.endTime}
                  </p>
                </div>
              </div>
              <div className="text-left shrink-0 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                <p className="text-[10px] text-violet-200 font-bold">متبقي</p>
                <p className="text-sm font-black">{activeItem.remainingMin} دقيقة</p>
              </div>
            </div>
          )}

          {notStartedYet && (
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3 text-blue-900 dark:text-blue-200 flex items-center gap-2.5 text-xs font-bold">
              <Sun className="w-4 h-4 text-blue-600 shrink-0" />
              <span>صباح الخير! يبدأ اليوم الدراسي بطابور الصباح الساعة 06:45 صباحاً.</span>
            </div>
          )}

          {allFinished && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>انتهى اليوم الدراسي لهذا اليوم بحمد الله ✨ موعدنا غداً بإذن الله!</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Day Timeline List ─── */}
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] pr-1">
        {timelineWithStatus.map((item) => {
          const isActive = item.status === 'active';
          const isFinished = item.status === 'finished';

          return (
            <div
              key={item.id}
              className={`p-3 rounded-2xl flex items-center justify-between gap-3 text-xs transition-all ${
                isActive
                  ? 'bg-violet-50 dark:bg-violet-500/15 border-2 border-violet-400 dark:border-violet-500/40 shadow-sm scale-[1.01]'
                  : isFinished
                  ? 'bg-gray-50/70 dark:bg-white/5 opacity-70 border border-gray-100 dark:border-transparent'
                  : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-violet-200'
              }`}
            >
              {/* Right icon & title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{item.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-black truncate ${
                        isActive
                          ? 'text-violet-950 dark:text-violet-200'
                          : isFinished
                          ? 'text-gray-500 dark:text-gray-400 line-through'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.name}
                    </span>
                    {item.isPeriod && (
                      <span className="text-[10px] text-gray-400 font-bold">
                        حصة {item.periodNumber}
                      </span>
                    )}
                  </div>
                  {item.teacher && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.teacher}</p>
                  )}
                </div>
              </div>

              {/* Left time and status */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-mono text-[11px] font-bold ${
                    isActive
                      ? 'text-violet-700 dark:text-violet-300'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {item.startTime} — {item.endTime}
                </span>

                {isActive && (
                  <span className="px-2 py-0.5 rounded-md bg-violet-600 text-white font-black text-[10px] animate-pulse">
                    الآن
                  </span>
                )}

                {isFinished && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> تم
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Footer Details ─── */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-medium">
        <span>{className}</span>
        <span className="flex items-center gap-1 font-bold text-gray-600 dark:text-gray-300">
          <Clock className="w-3 h-3 text-violet-500" /> 7 حصص تفاعلية يومياً
        </span>
      </div>
    </div>
  );
}
