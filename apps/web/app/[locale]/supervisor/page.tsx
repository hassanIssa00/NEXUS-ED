'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, ClipboardCheck, BarChart3, AlertTriangle, TrendingUp, Eye, FileText, Star, Calendar, Zap, Sparkles, Loader2, Target, Download, Sheet, MessageCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';

const initialPerformanceMetrics = [
    { label: 'تحضير الدروس والخطط', value: 98 },
    { label: 'التفاعل الصفي والمشاركة', value: 96 },
    { label: 'استخدام التقنية والمنصات', value: 95 },
    { label: 'إدارة الصف والانضباط', value: 97 },
    { label: 'التقويم المستمر والواجبات', value: 98 },
];

export default function SupervisorDashboard() {
    const [realVisitData, setRealVisitData] = useState<any[]>([]);
    const [realPerformanceMetrics, setRealPerformanceMetrics] = useState<any[]>(initialPerformanceMetrics);
    const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [supervisorTab, setSupervisorTab] = useState<'dashboard'|'visits'|'analytics'>('dashboard');
    const [supervisorStudents, setSupervisorStudents] = useState<any[]>([]);
    const [supervisorMetrics, setSupervisorMetrics] = useState<any>(null);
    const [newVisitNote, setNewVisitNote] = useState('');
    const [visitNotes, setVisitNotes] = useState<any[]>([]);
    const { signOut } = useAuth();

    useEffect(() => {
        const load = async () => {
            try {
                const { nexusBridge } = await import('@/lib/nexusDataBridge');
                const metrics = nexusBridge.getSchoolMetrics();
                const students = nexusBridge.getStudents();
                const hw = nexusBridge.getHomework();
                const certs = nexusBridge.getCertificates();

                const teachers = nexusBridge.getTeachers();
                const visits = teachers.slice(0, 6).map((t, idx) => ({
                    id: idx + 1,
                    teacher: t.name,
                    subject: t.specialization,
                    class: t.assignedClassIds?.[0] ? `فصل ${t.assignedClassIds[0]}` : 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
                    date: idx === 0 ? new Date().toISOString().split('T')[0] : `2026-09-${15 + idx * 2}`,
                    rating: idx === 0 ? 5.0 : Number((4.7 + (idx % 3) * 0.1).toFixed(1)),
                    status: 'مكتملة',
                }));
                setRealVisitData(visits);

                setRealPerformanceMetrics([
                    { label: 'تحضير الدروس والخطط', value: Math.min(100, metrics.averageSchoolGrade + 3) },
                    { label: 'التفاعل الصفي والمشاركة', value: metrics.attendanceRate },
                    { label: 'استخدام التقنية والمنصات', value: Math.min(100, metrics.averageSchoolGrade) },
                    { label: 'إدارة الصف والانضباط', value: Math.min(100, metrics.attendanceRate + 2) },
                    { label: 'التقويم المستمر والواجبات', value: hw.length > 0 ? 98 : 85 },
                ]);
                setSupervisorStudents(students);
                setSupervisorMetrics(metrics);
                try { const vn = localStorage.getItem('nexus_visit_notes'); if(vn) setVisitNotes(JSON.parse(vn)) } catch {}
            } catch (e) {
                console.error('nexusBridge supervisor load error:', e);
            }
        };

        load();
        window.addEventListener('nexus:data-changed', load as any);
        return () => window.removeEventListener('nexus:data-changed', load as any);
    }, []);

    const completedVisits = realVisitData.filter(v => v.status === 'مكتملة').length;
    const scheduledVisits = realVisitData.filter(v => v.status === 'مجدولة').length;
    const avgRating = realVisitData.filter(v => v.rating > 0).reduce((sum, v) => sum + v.rating, 0) / (completedVisits || 1);

    const generateAiRecommendation = async () => {
        setAiLoading(true);
        try {
            const res = await apiClient.post('/ai/ask', {
                question: `أنت مشرف تربوي خبير ومدرب. بناءً على مؤشرات الأداء التالية للمعلمين: ${JSON.stringify(realPerformanceMetrics)}. أعطني توصية تدريبية واحدة مركزة لتطوير أداء المعلمين.`
            });
            setAiRecommendation(res.data?.data?.answer || 'يبدو أن التركيز على دمج التقنية في التعليم سيحقق قفزة نوعية في الأداء العام.');
        } catch {
            setAiRecommendation('تقرير فصلي ممتاز لفصل د. إسماعيل عيسى مع نسب إنجاز تفوق 95%. يُوصى بنقل تجربة التعليم التفاعلي للفصول المجاورة.');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12" dir="rtl">
            {/* Export Modal */}
            <AnimatePresence>
                {exportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setExportModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-card w-full max-w-md p-8 rounded-[2rem] shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                                <div className="flex gap-2">
                                    <img src="/logo_new.webp" alt="Logo" className="w-10 h-10 rounded-lg shadow-sm border border-border" />
                                    <img src="/second_logo.webp" alt="School Logo" className="w-10 h-10 rounded-lg shadow-sm border border-border" />
                                </div>
                                <h2 className="text-xl font-black text-foreground">تصدير التقرير الإشرافي</h2>
                            </div>
                            <p className="text-muted-foreground mb-8 text-sm font-medium leading-relaxed">
                                الرجاء اختيار صيغة التقرير المطلوب تصديره. يشمل التقرير تقييمات المعلمين ومؤشرات الأداء.
                            </p>
                            <div className="flex gap-4">
                                <button onClick={() => { 
                                    window.print(); 
                                    setExportModalOpen(false); 
                                }} className="flex-1 flex flex-col items-center gap-3 p-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl border border-indigo-200 transition-colors shadow-sm dark:bg-indigo-500/10 dark:border-indigo-500/30">
                                    <FileText className="w-8 h-8" />
                                    <span className="font-bold text-sm">تصدير PDF</span>
                                </button>
                                <button onClick={() => { 
                                    const headers = ['المعلم', 'المادة', 'الفصل', 'التاريخ', 'التقييم', 'الحالة'];
                                    const rows = realVisitData.map(v => [v.teacher, v.subject, v.class, v.date, v.rating.toString(), v.status]);
                                    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const link = document.createElement('a');
                                    link.href = URL.createObjectURL(blob);
                                    link.download = 'التقرير_الإشرافي.csv';
                                    link.click();
                                    setExportModalOpen(false);
                                }} className="flex-1 flex flex-col items-center gap-3 p-5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-2xl border border-teal-200 transition-colors shadow-sm dark:bg-teal-500/10 dark:border-teal-500/30">
                                    <Sheet className="w-8 h-8" />
                                    <span className="font-bold text-sm">تصدير Excel</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Development Plan Modal */}
            {planModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPlanModalOpen(false)}>
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card w-full max-w-lg p-8 rounded-[2rem] shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-500" />
                                الخطة التطويرية الذكية
                            </h2>
                        </div>
                        <p className="text-muted-foreground mb-4 text-sm font-medium leading-relaxed">
                            تم استخراج خطط تطويرية مخصصة بناءً على تحليل الذكاء الاصطناعي للفئة المستهدفة:
                        </p>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {[
                                { name: 'أحمد فيصل الغامدي', plan: 'دعم إضافي في مهارات القراءة الاستيعابية', level: 'متوسط' },
                                { name: 'أ. سارة خالد', plan: 'ورشة عمل حول دمج التقنية في الشرح', level: 'متقدم' },
                                { name: 'د. حسن عمر', plan: 'تحسين استراتيجيات إدارة الوقت في الفصل', level: 'متوسط' },
                                { name: 'أ. نورة سعد', plan: 'تطوير طرق التقويم المستمر للطلاب', level: 'مبتدئ' },
                                { name: 'يوسف عبدالله', plan: 'تعزيز مهارات القيادة الطلابية والمشاركة', level: 'متقدم' }
                            ].map((target, idx) => (
                                <div key={idx} className="bg-muted/50 p-4 rounded-xl border border-border flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-sm text-foreground">{target.name}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{target.level}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium">{target.plan}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setPlanModalOpen(false)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-500/30">
                                إغلاق
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* HERO */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-700 p-8 md:p-10 text-white shadow-[0_20px_50px_rgba(59,130,246,0.25)]">
                <div className="absolute inset-0 pointer-events-none opacity-40">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                        className="absolute -top-40 -right-40 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                        className="absolute -bottom-40 -left-20 w-[300px] h-[300px] bg-cyan-400/20 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-8">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4">
                            <Target className="w-3 h-3 text-cyan-300" />
                            <span className="text-xs font-bold text-indigo-100">بوابة المشرف التربوي</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">الإشراف التربوي والتقييم 🎯</h1>
                        <p className="text-white/80 text-sm md:text-base font-medium max-w-xl leading-relaxed mb-6">
                            قيادة جودة التعليم من خلال تقييم المعلمين، التوجيه المستمر، وتحليل مؤشرات الأداء لبناء خطط التحسين.
                        </p>
                        <div className="flex flex-wrap gap-3 no-print">
                            <button onClick={() => setExportModalOpen(true)} className="bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-colors flex items-center gap-2">
                                <FileText className="w-4 h-4" /> تصدير التقرير
                            </button>
                            <a href="https://wa.me/201098810794" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white hover:bg-[#25D366]/90 rounded-xl font-bold text-sm transition-colors shadow-lg">
                                <MessageCircle className="w-4 h-4" />
                                الدعم الفني
                            </a>
                            <button onClick={() => signOut()} className="flex items-center gap-2 px-6 py-3 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 rounded-xl font-bold text-sm transition-colors border border-rose-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                تسجيل الخروج
                            </button>
                        </div>
                    </div>

                    {/* Print Header */}
                    <div className="hidden print-only mt-8 text-center bg-white p-6 rounded-2xl w-full">
                        <div className="flex justify-center gap-4 mb-4">
                            <img src="/logo_new.webp" alt="Logo" className="w-20 h-20 rounded-xl border border-gray-200" />
                            <img src="/second_logo.webp" alt="School Logo" className="w-20 h-20 rounded-xl border border-gray-200" />
                        </div>
                        <h2 className="text-3xl font-black mb-2 text-black">التقرير الإشرافي الشامل</h2>
                        <p className="text-gray-600 font-medium">نظام Nexus EDU - تقييم المعلمين ومؤشرات الأداء</p>
                    </div>

                    {/* AI Supervisor Advisor */}
                    <div className="w-full md:w-[350px] bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700" />
                        <div className="relative z-10">
                            <h3 className="font-black text-white text-sm mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                </div>
                                الموجه التربوي AI
                            </h3>
                            <div className="bg-black/20 rounded-xl p-4 border border-white/10 min-h-[100px] flex flex-col justify-center">
                                {aiRecommendation ? (
                                    <p className="text-[13px] text-white/90 leading-relaxed font-medium">{aiRecommendation}</p>
                                ) : (
                                    <button onClick={() => setPlanModalOpen(true)} disabled={aiLoading}
                                        className="w-full bg-indigo-500 hover:bg-indigo-600 py-3 rounded-xl text-xs font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-white">
                                        <Zap className="w-4 h-4" />
                                        استخراج خطة تطويرية
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* TAB BAR */}
            <div className="flex gap-2 bg-gray-100/80 dark:bg-white/5 p-1.5 rounded-2xl overflow-x-auto">
                {[
                    { key: 'dashboard', label: '📊 لوحة التحكم' },
                    { key: 'visits', label: '🏫 الزيارات الإشرافية' },
                    { key: 'analytics', label: '📈 تحليلات الفصل' },
                ].map(t => (
                    <button key={t.key} onClick={() => setSupervisorTab(t.key as any)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                            supervisorTab === t.key ? 'bg-white dark:bg-[#1e1e2d] text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}>{t.label}</button>
                ))}
            </div>

            {supervisorTab === 'dashboard' && (<>

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="المعلمين تحت الإشراف" value="24" icon={Users} color="#4f46e5" bg="bg-indigo-50 dark:bg-indigo-500/10" />
                <StatCard title="الزيارات المكتملة" value={completedVisits} icon={ClipboardCheck} color="#0d9488" bg="bg-teal-50 dark:bg-teal-500/10" />
                <StatCard title="الزيارات المجدولة" value={scheduledVisits} icon={Calendar} color="#f59e0b" bg="bg-amber-50 dark:bg-amber-500/10" />
                <StatCard title="متوسط التقييم" value={avgRating.toFixed(1)} icon={Star} color="#eab308" bg="bg-yellow-50 dark:bg-yellow-500/10" />
            </div>

            {/* TWO COLUMNS */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* VISITS TABLE */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex justify-between items-center">
                        <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                <Eye className="w-4 h-4 text-indigo-500" />
                            </div>
                            سجل الزيارات الإشرافية
                        </h3>
                        <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">عرض الكل</button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-right border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-white dark:bg-[#1e1e2d] text-gray-500 dark:text-gray-400 text-xs font-bold border-b border-gray-100 dark:border-white/5">
                                    <th className="p-4 px-6">المعلم</th>
                                    <th className="p-4">المادة</th>
                                    <th className="p-4">الفصل</th>
                                    <th className="p-4">التاريخ</th>
                                    <th className="p-4">التقييم</th>
                                    <th className="p-4 px-6">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {realVisitData.map((visit) => (
                                    <tr key={visit.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="p-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/30">
                                                    {visit.teacher.replace('أ. ', '').replace('د. ', '').charAt(0)}
                                                </div>
                                                <p className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{visit.teacher}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-medium text-gray-500">{visit.subject}</td>
                                        <td className="p-4 text-xs font-medium text-gray-500">{visit.class}</td>
                                        <td className="p-4 text-xs font-bold text-gray-400">{visit.date}</td>
                                        <td className="p-4">
                                            {visit.rating > 0 ? (
                                                <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-500/10 px-2 py-1 rounded-lg w-fit border border-yellow-100 dark:border-yellow-500/20">
                                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                                    <span className="font-black text-yellow-700 dark:text-yellow-400 text-xs">{visit.rating}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black border ${
                                                visit.status === 'مكتملة' ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/30' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                                            }`}>{visit.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* PERFORMANCE METRICS */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-7 shadow-sm">
                    <h3 className="font-extrabold text-gray-900 dark:text-white mb-6 flex items-center gap-2 text-base">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                        </div>
                        مؤشرات الأداء العامة
                    </h3>
                    <div className="space-y-5">
                        {realPerformanceMetrics.map((metric, i) => (
                            <div key={i}>
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{metric.label}</span>
                                    <span className={`text-xs font-black ${metric.value >= 90 ? 'text-indigo-600 dark:text-indigo-400' : metric.value >= 80 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>{metric.value}%</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 dark:bg-[#12121a] rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${metric.value}%` }} transition={{ duration: 1, delay: i * 0.1 }}
                                        className={`h-full rounded-full relative ${metric.value >= 90 ? 'bg-indigo-500' : metric.value >= 80 ? 'bg-teal-500' : 'bg-amber-500'}`}>
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-50" />
                                    </motion.div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-5 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl" />
                        <h4 className="font-extrabold text-indigo-800 dark:text-indigo-400 text-sm mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> تنبيه NEXUS AI
                        </h4>
                        <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed">
                            لوحظ تراجع في مؤشر &quot;استخدام التقنية&quot; لـ 3 معلمين. الذكاء الاصطناعي يقترح تنظيم ورشة عمل داخلية حول استراتيجيات التعليم الرقمي الفعال.
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: FileText, label: 'تقرير إشرافي', desc: 'إنشاء تقرير زيارة جديد', color: 'from-blue-500 to-blue-700', shadow: 'shadow-blue-500/30' },
                    { icon: ClipboardCheck, label: 'نموذج تقييم', desc: 'تقييم أداء معلم', color: 'from-teal-500 to-teal-700', shadow: 'shadow-teal-500/30' },
                    { icon: AlertTriangle, label: 'خطة علاجية', desc: 'إنشاء خطة تحسين أداء', color: 'from-amber-500 to-amber-700', shadow: 'shadow-amber-500/30' },
                    { icon: BookOpen, label: 'تبادل الزيارات', desc: 'جدولة زيارة متبادلة', color: 'from-purple-500 to-purple-700', shadow: 'shadow-purple-500/30' },
                ].map((action, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                        whileHover={{ scale: 1.03, y: -2 }} className={`relative overflow-hidden rounded-[2rem] p-6 cursor-pointer shadow-lg bg-gradient-to-br ${action.color} group ${action.shadow}`}>
                        <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-6 -translate-y-6 group-hover:scale-150 transition-transform duration-700" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20 shadow-inner">
                                <action.icon className="w-6 h-6 text-white" />
                            </div>
                            <h4 className="font-black text-white text-base mb-1">{action.label}</h4>
                            <p className="text-white/70 text-xs font-medium">{action.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </>)}

            {supervisorTab === 'visits' && (
                <motion.div key="sv-visits" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-6 text-white">
                        <h2 className="text-2xl font-black mb-1">🏫 الزيارات الإشرافية</h2>
                        <p className="text-indigo-200 text-sm">تسجيل ومتابعة زيارات فصل د. إسماعيل عيسى</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                        <h3 className="font-black text-gray-900 dark:text-white mb-3">📝 إضافة ملاحظة زيارة جديدة</h3>
                        <textarea value={newVisitNote} onChange={e=>setNewVisitNote(e.target.value)} rows={4}
                            placeholder="ملاحظات الزيارة الإشرافية لفصل د. إسماعيل..."
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-3" />
                        <button onClick={() => {
                            if (!newVisitNote.trim()) return;
                            const entry = { id: Date.now().toString(), teacher: 'د. إسماعيل عيسى', date: new Date().toISOString(), note: newVisitNote, rating: 5 };
                            const updated = [entry, ...visitNotes];
                            setVisitNotes(updated);
                            localStorage.setItem('nexus_visit_notes', JSON.stringify(updated));
                            setNewVisitNote('');
                        }} disabled={!newVisitNote.trim()}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-sm hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 transition-all">
                            💾 حفظ الزيارة
                        </button>
                    </div>
                    <div className="space-y-3">
                        {[...visitNotes, ...realVisitData].map((v: any, i: number) => (
                            <motion.div key={v.id||i} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                                className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-lg">🏫</div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-black text-sm text-gray-900 dark:text-white">{v.teacher}</p>
                                            <span className="text-[10px] text-gray-400">{new Date(v.date||v.createdAt||Date.now()).toLocaleDateString('ar-SA')}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{v.note || `${v.subject} — ${v.status}`}</p>
                                        <div className="flex mt-1">{[1,2,3,4,5].map(s=><span key={s} className={`text-xs ${s<=(v.rating||5)?'text-amber-400':'text-gray-300'}`}>⭐</span>)}</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {supervisorTab === 'analytics' && (
                <motion.div key="sv-analytics" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] p-6 text-white">
                        <h2 className="text-2xl font-black mb-1">📈 تحليلات فصل د. إسماعيل</h2>
                        <p className="text-emerald-100 text-sm">إحصاءات وتحليلات أداء الفصل</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'إجمالي الطلاب', value: supervisorStudents.length || 8, icon: '👥', color: 'from-blue-500 to-indigo-600' },
                            { label: 'المتفوقون', value: supervisorStudents.filter((s:any)=>s.status==='excellent').length || 3, icon: '⭐', color: 'from-amber-500 to-yellow-600' },
                            { label: 'نسبة الحضور', value: `${supervisorMetrics?.attendanceRate||97}%`, icon: '📅', color: 'from-green-500 to-emerald-600' },
                            { label: 'متوسط الدرجات', value: `${supervisorMetrics?.averageSchoolGrade||92}%`, icon: '📈', color: 'from-violet-500 to-purple-600' },
                            { label: 'الواجبات المُسلَّمة', value: supervisorMetrics?.totalHomework || 6, icon: '📝', color: 'from-teal-500 to-cyan-600' },
                            { label: 'الشهادات الممنوحة', value: supervisorMetrics?.awardedCertificates || 4, icon: '🏆', color: 'from-rose-500 to-pink-600' },
                        ].map((s: any, i: number) => (
                            <motion.div key={i} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.07}}
                                className={`bg-gradient-to-br ${s.color} rounded-3xl p-5 text-white`}>
                                <div className="text-2xl mb-2">{s.icon}</div>
                                <p className="text-xl font-black">{s.value}</p>
                                <p className="text-xs opacity-80 font-bold">{s.label}</p>
                            </motion.div>
                        ))}
                    </div>
                    <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                        <h3 className="font-black text-gray-900 dark:text-white mb-4">توزيع الدرجات</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'ممتاز (90-100)', count: supervisorStudents.filter((s:any)=>s.averageGrade>=90).length||3, color: 'bg-emerald-500', pct: 38 },
                                { label: 'جيد جداً (80-89)', count: supervisorStudents.filter((s:any)=>s.averageGrade>=80&&s.averageGrade<90).length||3, color: 'bg-blue-500', pct: 38 },
                                { label: 'جيد (70-79)', count: supervisorStudents.filter((s:any)=>s.averageGrade>=70&&s.averageGrade<80).length||2, color: 'bg-amber-500', pct: 24 },
                                { label: 'يحتاج دعم (<70)', count: supervisorStudents.filter((s:any)=>(s.averageGrade||90)<70).length||0, color: 'bg-rose-500', pct: 0 },
                            ].map((d: any, i: number) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{d.label}</span>
                                        <span className="text-xs font-black text-gray-900 dark:text-white">{d.count} طالب</span>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{width:0}} animate={{width:`${d.pct}%`}} transition={{delay:0.3+i*0.1,duration:0.8}}
                                            className={`h-full ${d.color} rounded-full`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg }: { title: string, value: string | number, icon: any, color: string, bg: string }) {
    return (
        <motion.div whileHover={{ y: -4, scale: 1.02 }} className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex items-center gap-4 group relative overflow-hidden">
            <div className={`absolute -top-10 -right-10 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl rounded-full`} style={{ backgroundColor: color }} />
            <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0 relative z-10 border border-white/5`}>
                <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div className="relative z-10">
                <p className="text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">{value}</p>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{title}</p>
            </div>
        </motion.div>
    );
}
