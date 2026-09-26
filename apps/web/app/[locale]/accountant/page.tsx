'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, CheckCircle, Clock, Wallet, Search, Filter, Download, FileText, Sheet, BarChart3, Receipt, CreditCard, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/auth-context';
import type { ClassStudentRecord } from '@/lib/nexusDataBridge';

export default function AccountantDashboard() {
    const [students, setStudents] = useState<ClassStudentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const { signOut } = useAuth();

    // Standard school term tuition fee per student
    const TERM_FEE = 3500;

    useEffect(() => {
        const load = async () => {
            try {
                const { nexusBridge } = await import('@/lib/nexusDataBridge');
                setStudents(nexusBridge.getStudents());
            } catch (e) {
                console.error('Accountant load error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
        window.addEventListener('nexus:data-changed', load as any);
        return () => window.removeEventListener('nexus:data-changed', load as any);
    }, []);

    // Payment state per student (initialized with realistic tuition tracking for Dr. Ismail's class)
    const [paymentStatuses, setPaymentStatuses] = useState<Record<string, { status: 'paid' | 'pending'; paidAmount: number; receiptNo: string; date: string }>>({
        'cls-std-1': { status: 'paid', paidAmount: 3500, receiptNo: 'REC-1448-001', date: '2026-09-01' },
        'cls-std-2': { status: 'paid', paidAmount: 3500, receiptNo: 'REC-1448-002', date: '2026-09-02' },
        'cls-std-3': { status: 'pending', paidAmount: 1750, receiptNo: 'REC-1448-003', date: '2026-09-10' },
        'cls-std-4': { status: 'paid', paidAmount: 3500, receiptNo: 'REC-1448-004', date: '2026-09-03' },
        'cls-std-5': { status: 'paid', paidAmount: 3500, receiptNo: 'REC-1448-005', date: '2026-09-04' },
        'cls-std-6': { status: 'pending', paidAmount: 0, receiptNo: '-', date: '-' },
        'cls-std-7': { status: 'paid', paidAmount: 3500, receiptNo: 'REC-1448-006', date: '2026-09-05' },
        'cls-std-8': { status: 'paid', paidAmount: 3500, receiptNo: 'REC-1448-007', date: '2026-09-06' },
    });

    const totalTuition = students.length * TERM_FEE;
    const collectedAmount = Object.values(paymentStatuses).reduce((sum, p) => sum + p.paidAmount, 0);
    const pendingAmount = totalTuition - collectedAmount;
    const paidStudentsCount = Object.values(paymentStatuses).filter(p => p.status === 'paid').length;

    const handleMarkAsPaid = (studentId: string) => {
        setPaymentStatuses(prev => ({
            ...prev,
            [studentId]: {
                status: 'paid',
                paidAmount: TERM_FEE,
                receiptNo: `REC-1448-${String(Math.floor(Math.random() * 900) + 100)}`,
                date: new Date().toISOString().split('T')[0],
            }
        }));
    };

    const filteredStudents = students.filter(std => {
        const matchesQuery = std.fullName.includes(searchQuery) || (std.parentName && std.parentName.includes(searchQuery));
        const status = paymentStatuses[std.id]?.status || 'pending';
        const matchesFilter = filterStatus === 'all' || status === filterStatus;
        return matchesQuery && matchesFilter;
    });

    return (
        <div className="min-h-screen bg-background p-6 md:p-8 space-y-8" dir="rtl">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#065f46] via-[#047857] to-[#10b981] p-8 text-white shadow-[0_20px_60px_rgba(16,185,129,0.25)]">
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-100">الشؤون الإدارية والمالية</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">إدارة الرسوم والمتحصلات المدرسية 💳</h1>
                        <p className="text-emerald-100 text-sm font-medium">متابعة الأقساط المدرسية وسندات القبض لطلاب فصل د. إسماعيل عيسى</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setExportModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 border border-white/20 rounded-2xl font-bold text-sm text-white backdrop-blur-md transition-colors">
                            <Download className="w-4 h-4" />تصدير التقرير
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Smart Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">إجمالي الرسوم</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">{totalTuition.toLocaleString()} ر.س</p>
                    <p className="text-xs text-gray-400 font-medium">رسوم {students.length} طلاب مسجلين</p>
                </div>

                <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-teal-600" />
                        </div>
                        <span className="text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-500/10 px-2.5 py-1 rounded-full">تم تحصيله</span>
                    </div>
                    <p className="text-3xl font-black text-teal-600 mb-1">{collectedAmount.toLocaleString()} ر.س</p>
                    <p className="text-xs text-gray-400 font-medium">{paidStudentsCount} طلاب أتموا السداد كاملاً</p>
                </div>

                <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">المتبقي</span>
                    </div>
                    <p className="text-3xl font-black text-amber-600 mb-1">{pendingAmount.toLocaleString()} ر.س</p>
                    <p className="text-xs text-gray-400 font-medium">{students.length - paidStudentsCount} طلاب بحاجة لمتابعة</p>
                </div>

                <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full">نسبة التحصيل</span>
                    </div>
                    <p className="text-3xl font-black text-blue-600 mb-1">{Math.round((collectedAmount / (totalTuition || 1)) * 100)}%</p>
                    <p className="text-xs text-gray-400 font-medium">الفصل الدراسي الأول 1448هـ</p>
                </div>
            </div>

            {/* Students Tuition Table */}
            <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">قائمة رسوم طلاب الفصل</h2>
                            <p className="text-xs text-gray-500">فصل د. إسماعيل عيسى — الصف الأول الابتدائي</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="بحث باسم الطالب أو ولي الأمر..."
                                className="pr-9 pl-4 py-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                        </div>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                            className="px-3 py-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white focus:outline-none">
                            <option value="all">جميع الحالات</option>
                            <option value="paid">مسدد بالكامل</option>
                            <option value="pending">متبقي سداد</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 font-bold">لا يوجد طلاب مطابقين للبحث</div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredStudents.map((std, i) => {
                            const p = paymentStatuses[std.id] || { status: 'pending', paidAmount: 0, receiptNo: '-', date: '-' };
                            const isPaid = p.status === 'paid';
                            return (
                                <div key={std.id} className="p-5 flex flex-wrap items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center font-black text-emerald-700 dark:text-emerald-300">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{std.fullName}</p>
                                        <p className="text-xs text-gray-400">ولي الأمر: {std.parentName || 'مسجل'} • {std.parentPhone || '-'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{p.paidAmount} / {TERM_FEE} ر.س</p>
                                        <p className="text-[11px] text-gray-400">{p.receiptNo !== '-' ? `سند: ${p.receiptNo}` : 'بانتظار السداد'}</p>
                                    </div>
                                    <div>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                                            isPaid
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                        }`}>
                                            {isPaid ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                            {isPaid ? 'مسدد بالكامل' : 'قيد السداد'}
                                        </span>
                                    </div>
                                    <div>
                                        {!isPaid && (
                                            <button onClick={() => handleMarkAsPaid(std.id)}
                                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-sm">
                                                تسجيل سداد
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Export Modal */}
            {exportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setExportModalOpen(false)}>
                    <div className="bg-white dark:bg-[#1e1e2d] w-[450px] p-8 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-white/5" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-3">تصدير التقرير المالي للفصل</h2>
                        <p className="text-gray-500 text-sm mb-6">تقرير الأقساط المدرسية وسندات القبض لطلاب فصل د. إسماعيل عيسى.</p>
                        <div className="flex gap-3">
                            <button onClick={() => { window.print(); setExportModalOpen(false); }}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-sm hover:bg-rose-100">
                                <FileText className="w-4 h-4" />طباعة PDF
                            </button>
                            <button onClick={() => setExportModalOpen(false)}
                                className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-600 font-bold text-sm">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
