'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, CheckCircle, Clock, Wallet, Search, Filter, Download, FileText, Sheet, BarChart3, BrainCircuit } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '@/contexts/auth-context';

const budgetData = [
  { name: 'ش 1', الميزانية: 40000, المصروفات: 24000 },
  { name: 'ش 2', الميزانية: 70000, المصروفات: 45000 },
  { name: 'ش 3', الميزانية: 45000, المصروفات: 30000 },
  { name: 'ش 4', الميزانية: 90000, المصروفات: 80000 },
  { name: 'ش 5', الميزانية: 65000, المصروفات: 40000 },
  { name: 'ش 6', الميزانية: 80000, المصروفات: 60000 },
  { name: 'ش 7', الميزانية: 50000, المصروفات: 20000 },
];

interface Employee {
    id: number;
    name: string;
    role: string;
    salary: number;
    status: 'paid' | 'pending';
    date: string;
}

const initialEmployees: Employee[] = [
    { id: 1, name: 'أحمد محمد', role: 'مدرس رياضيات', salary: 5000, status: 'paid', date: '2026-03-20' },
    { id: 2, name: 'سارة خالد', role: 'مدرسة لغة عربية', salary: 5200, status: 'pending', date: '-' },
    { id: 3, name: 'يوسف عبدالله', role: 'وكيل شئون طلاب', salary: 7000, status: 'pending', date: '-' },
    { id: 4, name: 'نورة سعد', role: 'موجه طلابي', salary: 6000, status: 'paid', date: '2026-03-21' },
    { id: 5, name: 'خالد عمر', role: 'مشرف تربوي', salary: 6500, status: 'pending', date: '-' },
];

export default function AccountantDashboard() {
    const [employees, setEmployees] = useState(initialEmployees);
    const [searchQuery, setSearchQuery] = useState('');
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const { signOut } = useAuth();

    const totalPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0);
    const paidAmount = employees.filter(e => e.status === 'paid').reduce((sum, emp) => sum + emp.salary, 0);
    const pendingAmount = totalPayroll - paidAmount;

    const handlePay = (id: number) => {
        setEmployees(currentEmployees =>
            currentEmployees.map(emp =>
                emp.id === id
                    ? {
                        ...emp,
                        status: 'paid',
                        date: new Date().toISOString().split('T')[0] ?? '-',
                    }
                    : emp
            )
        );
    };

    const filteredEmployees = employees.filter(emp => emp.name.includes(searchQuery) || emp.role.includes(searchQuery));

    return (
        <div className="min-h-screen bg-background p-8" dir="rtl">
            {/* Header */}
            {/* Export Modal */}
            {exportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setExportModalOpen(false)}>
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card w-[450px] p-8 rounded-[2rem] shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                            <div className="flex gap-2">
                                <img src="/logo_new.webp" alt="Logo" className="w-10 h-10 rounded-lg shadow-sm border border-border" />
                                <img src="/second_logo.webp" alt="School Logo" className="w-10 h-10 rounded-lg shadow-sm border border-border" />
                            </div>
                            <h2 className="text-xl font-black text-foreground">تصدير التقرير المالي</h2>
                        </div>
                        <p className="text-muted-foreground mb-8 text-sm font-medium leading-relaxed">
                            الرجاء اختيار صيغة التقرير المطلوب تصديره. التقرير يشمل الميزانية، مسيرات الرواتب الحالية، وملخص نفقات الذكاء الاصطناعي.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => { 
                                window.print(); 
                                setExportModalOpen(false); 
                            }} className="flex-1 flex flex-col items-center gap-3 p-5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl border border-rose-200 transition-colors shadow-sm">
                                <FileText className="w-8 h-8" />
                                <span className="font-bold text-sm">تصدير PDF</span>
                            </button>
                            <button onClick={() => { 
                                const headers = ['الموظف', 'الوظيفة', 'الراتب', 'تاريخ الصرف', 'الحالة'];
                                const rows = employees.map(emp => [
                                    emp.name,
                                    emp.role,
                                    emp.salary.toString(),
                                    emp.date,
                                    emp.status === 'paid' ? 'تم الصرف' : 'معلق'
                                ]);
                                const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = 'تقرير_المحاسبة_NEXUS.csv';
                                link.click();
                                setExportModalOpen(false);
                            }} className="flex-1 flex flex-col items-center gap-3 p-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-2xl border border-emerald-200 transition-colors shadow-sm">
                                <Sheet className="w-8 h-8" />
                                <span className="font-bold text-sm">تصدير Excel</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="flex justify-between items-center mb-8 no-print">
                <div>
                    <h1 className="text-[28px] font-extrabold text-foreground tracking-tight">بوابة المحاسبة الذكية</h1>
                    <p className="text-[14px] text-muted-foreground mt-1 font-medium">نظام Nexus ERP - إدارة مسيرات الرواتب والموارد المالية</p>
                </div>
                <div className="flex gap-3 no-print">
                    <button onClick={() => setExportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-card border border-slate-200 rounded-xl text-muted-foreground font-bold hover:bg-muted/50 transition-colors shadow-sm">
                        <Download className="w-4 h-4" />
                        تصدير التقرير
                    </button>
                    <button onClick={() => signOut()} className="flex items-center justify-center w-10 h-10 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors border border-red-100 shadow-sm" title="تسجيل الخروج">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center border-2 border-white shadow-md">
                        <span className="text-rose-600 font-bold text-lg">M</span>
                    </div>
                </div>
            </div>

            {/* Smart Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="إجمالي الرواتب المستحقة" value={`${totalPayroll} ر.س`} icon={Wallet} color="text-foreground" bg="bg-card" />
                <StatCard title="المبالغ المصروفة" value={`${paidAmount} ر.س`} icon={CheckCircle} color="text-teal-600" bg="bg-teal-50" />
                <StatCard title="المبالغ المعلقة" value={`${pendingAmount} ر.س`} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
                <StatCard title="إجمالي الموظفين" value={employees.length.toString()} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
            </div>
            {/* AI Insights & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 no-print">
                <div className="lg:col-span-2 bg-card rounded-[20px] shadow-sm border border-border p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -translate-x-32 -translate-y-32" />
                    <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2 text-foreground relative z-10"><BarChart3 className="w-5 h-5 text-indigo-500"/> تحليل الميزانية الشهرية (Flow Chart)</h3>
                    <div className="h-48 mt-4 relative z-10 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={budgetData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
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
                                    formatter={(value: any) => [`${value} ر.س`, '']}
                                    labelStyle={{ fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}
                                />
                                <Area type="monotone" dataKey="الميزانية" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorBudget)" />
                                <Area type="monotone" dataKey="المصروفات" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-rose-500/10 to-indigo-600/5 rounded-[20px] shadow-sm border border-rose-500/20 p-6 flex flex-col relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl" />
                    <h3 className="text-lg font-black mb-5 flex items-center gap-2 text-rose-700 dark:text-rose-400 relative z-10"><BrainCircuit className="w-5 h-5"/> التوجيه المالي الذكي (AI)</h3>
                    <div className="flex-1 space-y-4 relative z-10">
                        <div className="bg-white dark:bg-black/40 p-4 rounded-2xl border border-rose-500/10 shadow-sm transition-transform hover:-translate-y-1">
                            <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> فرصة توفير 12%</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed">يُظهر التحليل إمكانية تقليص نفقات التشغيل بنسبة 12% هذا الشهر بناءً على الاستهلاك.</p>
                        </div>
                        <div className="bg-white dark:bg-black/40 p-4 rounded-2xl border border-rose-500/10 shadow-sm transition-transform hover:-translate-y-1">
                            <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> تنبؤ الرواتب القادمة</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed">يتوقع الذكاء الاصطناعي زيادة 5% في ميزانية الرواتب للشهر القادم بسبب العلاوات.</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Main Automation Engine: Smart Payroll Table */}
            <div className="bg-card rounded-[20px] shadow-sm border border-border overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center bg-card no-print">
                    <div>
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-rose-500" />
                            مسير رواتب الشهر الحالي (موظفين الشهر)
                        </h2>
                    </div>
                    <div className="flex gap-3 no-print">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                            <input 
                                type="text"
                                placeholder="بحث عن موظف أو تخصص..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-64 h-10 pr-10 pl-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                            />
                        </div>
                        <button className="p-2 border border-slate-200 rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-muted/50/50 text-muted-foreground text-[13px] font-semibold border-b border-border">
                                <th className="p-4 pl-6">اسم الموظف</th>
                                <th className="p-4">المسمى الوظيفي</th>
                                <th className="p-4">الراتب الأساسي</th>
                                <th className="p-4">تاريخ الصرف</th>
                                <th className="p-4">حالة الصرف</th>
                                <th className="p-4 pr-6 text-left no-print">الإجراء السريع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map((emp) => (
                                <motion.tr 
                                    key={emp.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="border-b border-border/50 hover:bg-muted/50/50 transition-colors"
                                >
                                    <td className="p-4 pl-6 font-bold text-foreground dark:text-foreground flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                            {emp.name.charAt(0)}
                                        </div>
                                        {emp.name}
                                    </td>
                                    <td className="p-4 text-muted-foreground text-sm">{emp.role}</td>
                                    <td className="p-4 font-semibold text-foreground">{emp.salary} ر.س</td>
                                    <td className="p-4 text-muted-foreground text-sm">{emp.date}</td>
                                    <td className="p-4">
                                        {emp.status === 'paid' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-teal-100 text-teal-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> تم الصرف
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> معلق
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 pr-6 text-left no-print">
                                        {emp.status === 'pending' ? (
                                            <button 
                                                onClick={() => handlePay(emp.id)}
                                                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-rose-500/20"
                                            >
                                                صرف الراتب
                                            </button>
                                        ) : (
                                            <button className="px-4 py-1.5 bg-muted text-muted-foreground/80 text-xs font-bold rounded-lg cursor-not-allowed">
                                                تم بنجاح
                                            </button>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredEmployees.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground">لا يوجد موظفين يطابقون بحثك.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg }: { title: string, value: string, icon: any, color: string, bg: string }) {
    return (
        <div className="bg-card p-6 rounded-[20px] shadow-sm border border-border">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[13px] font-medium text-muted-foreground mb-1">{title}</p>
                    <h3 className={`text-2xl font-extrabold ${color}`}>{value}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${bg}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
            </div>
        </div>
    );
}
