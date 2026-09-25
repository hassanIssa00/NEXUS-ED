'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, BookOpen, Sparkles, CheckCircle2, User } from 'lucide-react';

export default function SchedulePage() {
    const [schedule, setSchedule] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { nexusBridge, CLASS_SCHEDULE, SCHOOL_TIMETABLE } = await import('@/lib/nexusDataBridge');
                setSchedule(CLASS_SCHEDULE || nexusBridge.getClassSchedule() || []);
                setTimetable(SCHOOL_TIMETABLE || nexusBridge.getSchoolTimetable() || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

    const SUBJECT_THEMES: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
        'اللغة العربية': { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-500/30', emoji: '📖' },
        'القرآن الكريم': { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/30', emoji: '📿' },
        'التربية الإسلامية': { bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-500/30', emoji: '🕌' },
        'الرياضيات': { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-500/30', emoji: '🔢' },
        'العلوم': { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-500/30', emoji: '🔬' },
        'فن': { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-500/30', emoji: '🎨' },
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-16" dir="rtl">
            {/* HERO */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-2xl">
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        <span className="text-xs font-bold text-violet-100">فصل د. إسماعيل عيسى</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">جدول الحصص الأسبوعي 📅</h1>
                    <p className="text-violet-100 text-sm max-w-xl font-medium">
                        الجدول المعتمد لطلاب الصف الأول الابتدائي — 7 حصص تفاعلية يومية من 06:45 صباحاً حتى 12:40 ظهراً
                    </p>
                </div>
            </motion.div>

            {/* TIMETABLE BREAKDOWN */}
            {timetable.length > 0 && (
                <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-base">
                        <Clock className="w-5 h-5 text-violet-500" />
                        توقيت اليوم الدراسي والفترات
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                        {timetable.map((slot, i) => (
                            <div key={i} className={`p-3 rounded-2xl text-center border ${
                                slot.type === 'break' ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20' :
                                slot.type === 'prayer' ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' :
                                slot.type === 'dismissal' ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20' :
                                'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5'
                            }`}>
                                <p className="font-bold text-xs text-gray-900 dark:text-white truncate">{slot.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{slot.startTime} - {slot.endTime}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WEEKLY GRID */}
            <div className="space-y-6">
                {DAYS.map((day, dayIdx) => {
                    const dayPeriods = schedule.filter(p => p.dayOfWeek === dayIdx);
                    return (
                        <motion.div key={day} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIdx * 0.05 }}
                            className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-black text-sm">
                                    {dayIdx + 1}
                                </div>
                                <h3 className="font-black text-gray-900 dark:text-white text-base">{day}</h3>
                                <span className="text-xs text-gray-400 font-medium">({dayPeriods.length} حصص معتمدة)</span>
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {dayPeriods.sort((a, b) => a.periodNumber - b.periodNumber).map((item, pi) => {
                                    const theme = SUBJECT_THEMES[item.subjectName] || {
                                        bg: 'bg-gray-50 dark:bg-white/5',
                                        text: 'text-gray-800 dark:text-gray-200',
                                        border: 'border-gray-200 dark:border-white/10',
                                        emoji: '📚'
                                    };
                                    return (
                                        <div key={pi} className={`p-4 rounded-2xl border ${theme.bg} ${theme.border} flex items-center gap-3.5`}>
                                            <div className="text-2xl">{theme.emoji}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h4 className={`font-black text-sm ${theme.text} truncate`}>{item.subjectName}</h4>
                                                    <span className="text-[10px] font-bold text-gray-400">حصة {item.periodNumber}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                                                    <span className="flex items-center gap-1 font-mono">
                                                        <Clock className="w-3 h-3 text-gray-400" />
                                                        {item.startTime} - {item.endTime}
                                                    </span>
                                                    <span className="font-medium text-gray-600 dark:text-gray-300">د. إسماعيل</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
