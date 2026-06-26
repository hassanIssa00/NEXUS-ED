'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserCheck, UserX, Briefcase, Search, Download, FileText, Sheet, BarChart3, BrainCircuit, LogOut, MessageCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api/client';

const initialStaff = [
    { id: 1, name: 'أحمد محمد', role: 'مدرس رياضيات', type: 'دوام كامل', attendance: 'حاضر', time: '07:15 AM' },
    { id: 2, name: 'سارة خالد', role: 'مدرسة لغة عربية', type: 'دوام كامل', attendance: 'غائب', time: '-' },
    { id: 3, name: 'يوسف عبدالله', role: 'وكيل شئون طلاب', type: 'إداري', attendance: 'حاضر', time: '07:05 AM' },
    { id: 4, name: 'نورة سعد', role: 'موجه طلابي', type: 'إداري', attendance: 'إجازة مرضية', time: '-' },
    { id: 5, name: 'مريم حسن', role: 'مدرسة علوم', type: 'دوام جزئي', attendance: 'حاضر', time: '08:00 AM' },
];

const attendanceTrend = [
    { name: 'الأحد', حضور: 95, غياب: 5 },
    { name: 'الاثنين', حضور: 92, غياب: 8 },
    { name: 'الثلاثاء', حضور: 97, غياب: 3 },
    { name: 'الأربعاء', حضور: 89, غياب: 11 },
    { name: 'الخميس', حضور: 85, غياب: 15 },
];

export default function HRDashboard() {
    const [staff, setStaff] = useState(initialStaff);
    const [searchQuery, setSearchQuery] = useState('');
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const { signOut } = useAuth();

    const presentCount = staff.filter(s => s.attendance === 'حاضر').length;
    const absentCount = staff.filter(s => s.attendance === 'غائب').length;
    const leaveCount = staff.filter(s => s.attendance === 'إجازة مرضية').length;

    const filteredStaff = staff.filter(s => s.name.includes(searchQuery) || s.role.includes(searchQuery));

    const generateAiInsight = async () => {
        setAiLoading(true);
        try {
            const res = await apiClient.post('/ai/ask', {
                question: `بصفتك مدير موارد بشرية، حلل معدلات الحضور والغياب للمعلمين وقدم توصية قصيرة لزيادة الانضباط.`
            });
            setAiRecommendation(res.data?.data?.answer || 'ينصح الذكاء الاصطناعي بربط حوافز الأداء بمعدلات الحضور المبكر.');
        } catch {
            setAiRecommendation('لا يمكن الوصول لخدمة الذكاء الاصطناعي حالياً.');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-8 pb-16" dir="rtl">
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
                                <h2 className="text-xl font-black text-foreground">تصدير تقرير الشؤون</h2>
                            </div>
                            <p className="text-muted-foreground mb-8 text-sm font-medium leading-relaxed">
                                الرجاء اختيار صيغة التقرير المطلوب تصديره. التقرير يشمل سجلات الحضور وإحصائيات الموظفين.
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
                                    const headers = ['الاسم', 'الوظيفة', 'النوع', 'الحضور', 'وقت التسجيل'];
                                    const rows = staff.map(s => [s.name, s.role, s.type, s.attendance, s.time]);
                                    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const link = document.createElement('a');
                                    link.href = URL.createObjectURL(blob);
                                    link.download = 'تقرير_الشؤون_الإدارية.csv';
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

            <div className="flex justify-between items-center mb-8 no-print">
                <div>
                    <h1 className="text-[28px] font-extrabold text-foreground tracking-tight">بوابة الشؤون الإدارية (HR)</h1>
                    <p className="text-[14px] text-muted-foreground mt-1">نظام Nexus ERP - إدارة شئون الموظفين والحضور والغياب والذكاء الاصطناعي</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setExportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-muted-foreground font-bold hover:bg-muted/50 transition-colors shadow-sm">
                        <Download className="w-4 h-4" />
                        تصدير التقرير
                    </button>
                    <a href="https://wa.me/201098810794" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl font-bold transition-colors shadow-sm border border-[#25D366]/20">
                        <MessageCircle className="w-4 h-4" />
                        الدعم الفني
                    </a>
                    <button onClick={() => signOut()} className="flex items-center justify-center w-10 h-10 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl transition-colors border border-rose-100 dark:border-rose-500/30 shadow-sm" title="تسجيل الخروج">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print-only mb-6 text-center">
                <div className="flex justify-center gap-4 mb-4">
                    <img src="/logo_new.webp" alt="Logo" className="w-16 h-16 rounded-xl border border-gray-200" />
                    <img src="/second_logo.webp" alt="School Logo" className="w-16 h-16 rounded-xl border border-gray-200" />
                </div>
                <h2 className="text-2xl font-black mb-2">تقرير الشؤون الإدارية (HR)</h2>
                <p className="text-gray-500 font-medium">التقرير المدمج للإحصائيات وسجلات الحضور</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="إجمالي المعلمين والموظفين" value={staff.length.toString()} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard title="حضور اليوم" value={presentCount.toString()} icon={UserCheck} color="text-teal-600" bg="bg-teal-50" />
                <StatCard title="غياب اليوم" value={absentCount.toString()} icon={UserX} color="text-rose-600" bg="bg-rose-50" />
                <StatCard title="في إجازة طبية العذر" value={leaveCount.toString()} icon={Briefcase} color="text-amber-600" bg="bg-amber-50" />
            </div>

            {/* AI Insights & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 no-print">
                <div className="lg:col-span-2 bg-card rounded-[20px] shadow-sm border border-border p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -translate-x-32 -translate-y-32" />
                    <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2 text-foreground relative z-10"><BarChart3 className="w-5 h-5 text-indigo-500"/> مؤشر حضور وانضباط الموظفين الأسبوعي</h3>
                    <div className="h-48 mt-4 relative z-10 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="حضور" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorPresent)" />
                                <Area type="monotone" dataKey="غياب" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorAbsent)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-500/10 to-teal-600/5 rounded-[20px] shadow-sm border border-indigo-500/20 p-6 flex flex-col relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
                    <h3 className="text-lg font-black mb-5 flex items-center gap-2 text-indigo-700 dark:text-indigo-400 relative z-10"><BrainCircuit className="w-5 h-5"/> مدير الموارد الذكي (AI)</h3>
                    
                    <div className="flex-1 bg-white/50 dark:bg-black/40 backdrop-blur-sm p-5 rounded-2xl border border-indigo-500/10 shadow-inner flex flex-col justify-center relative z-10 mb-4">
                        {aiRecommendation ? (
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed text-center">
                                "{aiRecommendation}"
                            </p>
                        ) : (
                            <div className="text-center">
                                <p className="text-sm text-gray-500 font-medium mb-3">احصل على تحليل فوري وتوصيات استراتيجية للموارد البشرية</p>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={generateAiInsight}
                        disabled={aiLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 z-10 relative"
                    >
                        {aiLoading ? <span className="animate-pulse">جاري التحليل...</span> : 'استخراج التوصيات'}
                    </button>
                </div>
            </div>

            <div className="bg-card rounded-[20px] shadow-sm border border-border overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center bg-card no-print">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">سجل بصمة الحضور والغياب اليومي</h2>
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                        <input type="text" placeholder="بحث عن موظف أو قسم..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64 h-10 pr-10 pl-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-muted/50/50 text-muted-foreground text-[13px] font-semibold border-b border-border">
                                <th className="p-4 pl-6">الاسم الكامل</th>
                                <th className="p-4">المسمى الوظيفي</th>
                                <th className="p-4">نوع العقد والتصنيف</th>
                                <th className="p-4">حالة الحضور اللحظية</th>
                                <th className="p-4 pr-6">وقت التسجيل / الدخول</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map((s) => (
                                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/50/50 transition-colors">
                                    <td className="p-4 pl-6 font-bold text-foreground flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">{s.name.charAt(0)}</div>
                                        {s.name}
                                    </td>
                                    <td className="p-4 text-muted-foreground text-sm bg-card">{s.role}</td>
                                    <td className="p-4 text-muted-foreground text-sm">{s.type}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${s.attendance === 'حاضر' ? 'bg-teal-100 text-teal-700' : s.attendance === 'غائب' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {s.attendance}
                                        </span>
                                    </td>
                                    <td className="p-4 pr-6 text-muted-foreground font-medium font-mono">{s.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg }: { title: string, value: string, icon: any, color: string, bg: string }) {
    return (
        <div className="bg-card p-6 rounded-[20px] shadow-sm border border-border flex justify-between items-start hover:-translate-y-1 transition-transform cursor-pointer">
            <div>
                <p className="text-[13px] font-medium text-muted-foreground mb-1">{title}</p>
                <h3 className={`text-2xl font-extrabold ${color}`}>{value}</h3>
            </div>
            <div className={`p-3 rounded-2xl ${bg}`}><Icon className={`w-6 h-6 ${color}`} /></div>
        </div>
    );
}
