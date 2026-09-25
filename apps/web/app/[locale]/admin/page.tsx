'use client'

import { useEffect, useState, useCallback } from 'react'
import { dashboardApi, AdminDashboardResponse } from '@/lib/api/dashboard'
import { useAuth } from '@/contexts/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import { SocketProvider, useRealtimeNotifications } from '@/lib/providers/socket-provider'
import {
  Activity, DollarSign, GraduationCap, Users, Plus, FileText,
  Database, Bell, Shield, BarChart3, TrendingUp, Zap, RefreshCw,
  CheckCircle2, AlertCircle, Clock, UserCheck, BookOpen, School,
  Download, Sheet, MessageCircle, LogOut
} from 'lucide-react'
import { Link } from '@/i18n/routing'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { LiveSystemHealth } from './_components/LiveSystemHealth'

function KpiCard({ title, value, icon: Icon, color, description, trend }: {
  title: string; value: string | number; icon: any; color: string; description: string; trend?: number
}) {
  const isUp = (trend ?? 0) >= 0
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}
      className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
      {/* Premium Glow Effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-3xl rounded-full"
        style={{ backgroundColor: color }} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden" 
               style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon className="w-6 h-6 z-10" style={{ color }} />
          </div>
          {trend !== undefined && (
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{value}</p>
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{title}</p>
        <div className="w-full h-[1px] bg-gradient-to-r from-gray-200 to-transparent dark:from-white/10 my-3" />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{description}</p>
      </div>
    </motion.div>
  )
}

function AdminDashboardInner() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveNotif, setLiveNotif] = useState<string | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [adminTab, setAdminTab] = useState<'dashboard' | 'accounts' | 'reports' | 'system'>('dashboard')
  const [adminStudents, setAdminStudents] = useState<any[]>([])
  const [adminMetrics, setAdminMetrics] = useState<any>(null)
  const { signOut } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      const metrics = nexusBridge.getSchoolMetrics()
      const students = nexusBridge.getStudents()
      const hw = nexusBridge.getHomework()
      const certs = nexusBridge.getCertificates()
      const obs = nexusBridge.getObservations()

      setAdminStudents(students)
      setAdminMetrics(metrics)

      const adminData: any = {
        kpis: {
          totalUsers: metrics.totalStudents + 8,
          activeUsers: metrics.totalStudents,
          totalRevenue: 24000,
          totalSubjects: 4,
          totalStudents: metrics.totalStudents,
          totalTeachers: 1,
          totalClasses: 1,
        },
        enrollmentSeries: [
          { label: 'Jan', value: 8 },
          { label: 'Feb', value: 8 },
          { label: 'Mar', value: metrics.totalStudents },
        ],
        revenueSeries: [
          { label: 'Jan', value: 20000 },
          { label: 'Feb', value: 22000 },
          { label: 'Mar', value: 24000 },
        ],
        invoiceSummary: {
          total: 8,
          paid: 7,
          pending: 1,
          failed: 0,
          requiresAction: 0,
          refunded: 0,
        },
        recentActivity: [
          ...obs.slice(0, 3).map(o => ({
            type: o.severity === 'positive' ? 'success' : o.severity === 'urgent' ? 'urgent' : 'info',
            text: `${o.studentName}: ${o.text}`,
            time: new Date(o.createdAt).toLocaleDateString('ar-SA'),
          })),
          ...certs.slice(0, 2).map(c => ({
            type: 'success',
            text: `تم إصدار شهادة معتمدة لـ ${c.studentName}: ${c.programTitle}`,
            time: new Date(c.createdAt).toLocaleDateString('ar-SA'),
          })),
        ].slice(0, 5),
        systemHealth: [
          { service: 'منظومة الحضور والغياب الذكية (فصل د. إسماعيل عيسى)', status: 'optimal' },
          { service: 'نظام إدارة الاختبارات والواجبات', status: 'optimal' },
          { service: 'بوابة الشهادات والتحقق بالباركود', status: 'optimal' },
        ],
      }
      setData(adminData)
      setError(null)
    } catch {
      setError('تعذر تحميل بيانات لوحة تحكم الإدارة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [load])

  useRealtimeNotifications(useCallback((n: any) => {
    setLiveNotif(n.title); setTimeout(() => setLiveNotif(null), 5000)
  }, []))

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-16 h-16">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 border-4 border-rose-500/20 border-t-rose-500 rounded-full" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 border-4 border-blue-500/20 border-t-blue-500 rounded-full" />
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="flex flex-col items-center gap-4 min-h-[60vh] justify-center text-center">
      <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-2">
        <AlertCircle className="w-10 h-10 text-rose-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">عذراً، حدث خطأ</h2>
      <p className="text-gray-500 max-w-sm">{error}</p>
      <button onClick={load} className="mt-4 px-6 py-3 bg-rose-600 hover:bg-rose-700 transition-colors text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/30">
        إعادة المحاولة
      </button>
    </div>
  )

  const enrollData = (data.enrollmentSeries || []).map(e => {
    const m: Record<string,string> = { Jan:'يناير',Feb:'فبراير',Mar:'مارس',Apr:'أبريل',May:'مايو',Jun:'يونيو',Jul:'يوليو',Aug:'أغسطس',Sep:'سبتمبر',Oct:'أكتوبر',Nov:'نوفمبر',Dec:'ديسمبر' }
    return { name: m[e.label] || e.label, طلاب: e.value }
  })
  const revData = (data.revenueSeries || []).map(e => {
    const m: Record<string,string> = { Jan:'يناير',Feb:'فبراير',Mar:'مارس',Apr:'أبريل',May:'مايو',Jun:'يونيو',Jul:'يوليو',Aug:'أغسطس',Sep:'سبتمبر',Oct:'أكتوبر',Nov:'نوفمبر',Dec:'ديسمبر' }
    return { name: m[e.label] || e.label, إيرادات: e.value }
  })
  const { paid, pending, failed, requiresAction, refunded } = data.invoiceSummary
  const invoiceData = [
    { name: 'مدفوعة', value: paid, color: '#10b981' },
    { name: 'معلقة', value: pending, color: '#f59e0b' },
    { name: 'فشلت', value: failed, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-md border border-gray-100 dark:border-white/10 p-3 rounded-xl shadow-xl">
          <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
                <h2 className="text-xl font-black text-foreground">تصدير التقرير الإداري</h2>
              </div>
              <p className="text-muted-foreground mb-8 text-sm font-medium leading-relaxed">
                الرجاء اختيار صيغة التقرير. يشمل التقرير جميع الإحصائيات العامة ومؤشرات النظام الحالية.
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
                  const headers = ['المؤشر', 'القيمة'];
                  const rows = [
                    ['الطلاب المسجلين', data.kpis.totalStudents.toString()],
                    ['الهيئة التعليمية', data.kpis.totalTeachers.toString()],
                    ['الفصول الدراسية', data.kpis.totalClasses.toString()],
                    ['الحسابات النشطة', data.kpis.activeUsers.toString()],
                    ['الإيرادات المحصلة', data.kpis.totalRevenue.toString() + ' ر.س']
                  ];
                  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'التقرير_الإداري.csv';
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

      {/* Live toast */}
      <AnimatePresence>
        {liveNotif && (
          <motion.div initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white px-5 py-3 rounded-2xl shadow-2xl shadow-rose-500/10 flex items-center gap-3 text-sm font-bold">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600">
              <Bell className="w-4 h-4" />
            </div>
            {liveNotif}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Hero Section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] p-8 md:p-10 text-white shadow-2xl no-print">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-rose-500/20 to-purple-500/20 rounded-full blur-3xl" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -left-20 w-80 h-80 bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[url('/noise.webp')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-emerald-100">النظام متصل ويعمل بكفاءة</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              مرحباً، {data.admin.name}
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-medium mb-8 max-w-xl leading-relaxed">
              هنا مركز القيادة الرئيسي لمنصة Nexus EDU. راقب مؤشرات الأداء، تابع سير العمليات الأكاديمية، وتحكم في الصلاحيات في الوقت الفعلي.
            </p>
            
            <div className="flex flex-wrap gap-4">
              {[
                { val: data.kpis.totalStudents, label: 'إجمالي الطلاب', icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { val: data.kpis.totalTeachers, label: 'الهيئة التعليمية', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                { val: `${(data.kpis.totalRevenue || 0).toLocaleString()} ر.س`, label: 'الإيرادات المحصلة', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 min-w-[160px]">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="font-black text-xl text-white tracking-tight">{s.val}</p>
                    <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <Link href="/admin/users" className="w-full md:w-auto">
              <button className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-gray-100 rounded-xl px-6 py-3.5 font-bold text-sm transition-all shadow-[0_0_20px_rgb(255,255,255,0.1)] hover:shadow-[0_0_30px_rgb(255,255,255,0.2)]">
                <Plus className="w-4 h-4" /> إضافة مستخدم جديد
              </button>
            </Link>
            
            <div className="flex gap-2">
              <button onClick={() => setExportModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-sm text-white transition-all backdrop-blur-sm">
                <FileText className="w-4 h-4" /> تصدير التقرير
              </button>
              <button onClick={load} className="flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-4 py-3.5 text-white transition-all backdrop-blur-sm" title="تحديث الإحصائيات">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <a href="https://wa.me/201098810794" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#25D366]/90 rounded-xl px-4 py-3.5 font-bold text-sm text-white transition-all shadow-lg">
                <MessageCircle className="w-4 h-4" /> الدعم الفني
              </a>
              <button onClick={() => signOut()} className="flex items-center justify-center bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 rounded-xl px-4 py-3.5 text-rose-100 transition-all" title="تسجيل الخروج">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* TAB BAR */}
      <div className="flex gap-2 bg-gray-100/80 dark:bg-white/5 p-1.5 rounded-2xl overflow-x-auto no-print">
        {[
          { key: 'dashboard', label: '📊 لوحة القيادة', icon: Activity },
          { key: 'accounts', label: '👥 الحسابات الثمانية', icon: Users },
          { key: 'reports', label: '📈 التقارير الشاملة', icon: FileText },
          { key: 'system', label: '🏫 بيانات الفصل والمزامنة', icon: School },
        ].map(t => (
          <button key={t.key} onClick={() => setAdminTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              adminTab === t.key ? 'bg-white dark:bg-[#1e1e2d] text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {adminTab === 'dashboard' && (<>

      {/* Print Header */}
      <div className="hidden print-only text-center bg-white p-6 rounded-2xl w-full border-b border-gray-100 mb-8">
          <div className="flex justify-center gap-4 mb-4">
              <img src="/logo_new.webp" alt="Logo" className="w-20 h-20 rounded-xl border border-gray-200" />
              <img src="/second_logo.webp" alt="School Logo" className="w-20 h-20 rounded-xl border border-gray-200" />
          </div>
          <h2 className="text-3xl font-black mb-2 text-black">تقرير منصة الإدارة المركزية (System Admin)</h2>
          <p className="text-gray-600 font-medium">نظام Nexus EDU - ملخص الأداء والإحصائيات الحيوية</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { title: 'إجمالي المستخدمين', value: data.kpis.totalUsers, icon: Users, color: '#ec4899', description: `${data.kpis.activeUsers} حساب نشط حالياً`, trend: 5 },
          { title: 'الطلاب المسجلين', value: data.kpis.totalStudents, icon: GraduationCap, color: '#3b82f6', description: 'زيادة مستمرة في أعداد القبول', trend: 3 },
          { title: 'الفصول الدراسية', value: data.kpis.totalClasses, icon: School, color: '#8b5cf6', description: `موزعة على ${data.kpis.totalSubjects} مادة دراسية` },
          { title: 'الإيرادات المالية', value: `${(data.kpis.totalRevenue || 0).toLocaleString()} ر.س`, icon: DollarSign, color: '#10b981', description: 'إجمالي الفواتير المدفوعة بنجاح', trend: 8 },
        ].map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}>
            <KpiCard {...k} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Registration Trend */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-7 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                معدل تسجيل الطلاب
              </h3>
              <p className="text-xs text-gray-500">إحصائيات النمو خلال العام الحالي</p>
            </div>
            <select className="bg-gray-50 dark:bg-white/5 border-none text-sm font-medium rounded-xl px-4 py-2 outline-none cursor-pointer">
              <option>هذا العام</option>
              <option>العام الماضي</option>
            </select>
          </div>
          
          <div className="h-[280px] w-full">
            {enrollData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="طلاب" stroke="#3b82f6" fill="url(#colorStudents)" strokeWidth={3} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center"><p className="text-gray-400 font-medium">لا توجد بيانات كافية</p></div>}
          </div>
        </motion.div>

        {/* Invoice Status */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-7 shadow-sm">
          <div className="mb-6">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              حالة الفواتير
            </h3>
            <p className="text-xs text-gray-500">توزيع المدفوعات والعمليات المالية</p>
          </div>
          
          <div className="relative h-[200px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invoiceData.length > 0 ? invoiceData : [{ name: 'لا توجد', value: 1, color: '#f3f4f6' }]}
                  cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={6}>
                  {(invoiceData.length > 0 ? invoiceData : [{ color: '#f3f4f6' }]).map((e: any, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">{paid + pending + failed}</span>
              <span className="text-xs font-bold text-gray-400 mt-1">إجمالي الفواتير</span>
            </div>
          </div>
          
          <div className="space-y-3 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
            {[
              { l: 'مدفوعة', v: paid, c: '#10b981' },
              { l: 'معلقة', v: pending, c: '#f59e0b' },
              { l: 'تتطلب إجراء', v: requiresAction, c: '#f97316' },
              { l: 'فشلت', v: failed, c: '#ef4444' },
            ].filter(s => s.v > 0).map(s => (
              <div key={s.l} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: s.c }} />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{s.l}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-[#1e1e2d] px-2 py-0.5 rounded-md shadow-sm border border-gray-100 dark:border-white/5">{s.v}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Analytics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-7 shadow-sm">
          <div className="mb-6">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              تحليل الإيرادات
            </h3>
            <p className="text-xs text-gray-500">العوائد المالية بالأشهر</p>
          </div>
          
          <div className="h-[220px]">
            {revData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.1 }} />
                  <Bar dataKey="إيرادات" fill="#10b981" radius={[6, 6, 6, 6]} maxBarSize={32}>
                    {revData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === revData.length - 1 ? '#10b981' : '#34d399'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center"><p className="text-gray-400 font-medium">لا توجد بيانات</p></div>}
          </div>
        </motion.div>

        {/* Recent Activity Timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-7 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                سجل النشاط
              </h3>
              <p className="text-xs text-gray-500">أحدث العمليات في المنصة</p>
            </div>
            <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
            {(data.recentActivity || []).slice(0, 6).map((item: any, i: number) => {
              const actionMap: Record<string,string> = { created:'إضافة', updated:'تعديل', deleted:'حذف', logged_in:'دخول' }
              const entityMap: Record<string,string> = { user:'مستخدم', class:'فصل', assignment:'واجب', payment:'دفعة', submission:'تسليم' }
              return (
                <div key={item.id} className="relative pl-4">
                  {i !== ((data.recentActivity || []).slice(0, 6).length - 1) && (
                    <div className="absolute right-3.5 top-8 bottom-[-16px] w-[2px] bg-gray-100 dark:bg-gray-800" />
                  )}
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 shadow-md border-2 border-white dark:border-[#1e1e2d] z-10">
                      {(item.actor || 'U')[0]}
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 flex-1 border border-gray-100/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.actor}</p>
                        <p className="text-[10px] font-medium text-gray-400">
                          {new Date(item.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        قام بـ <span className="font-bold text-purple-500">{actionMap[item.action] || item.action}</span> {entityMap[item.entityType] || ''}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {(!data.recentActivity || data.recentActivity.length === 0) && (
              <div className="h-full flex items-center justify-center py-10"><p className="text-gray-400 font-medium">لا يوجد نشاط مسجل</p></div>
            )}
          </div>
        </motion.div>

        {/* System Health Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-7 shadow-sm">
          <div className="mb-6">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-rose-500" />
              </div>
              صحة النظام
            </h3>
            <p className="text-xs text-gray-500">حالة الخوادم والخدمات السحابية</p>
          </div>
          
          <div className="space-y-4">
            {(data.systemHealth || []).map((item: any) => {
              const nameMap: Record<string,string> = {
                'Database Connection': 'خادم قاعدة البيانات',
                'API Latency': 'استجابة السيرفر',
                'Storage Usage': 'مساحة التخزين',
                'Active Websockets': 'الاتصالات الحية (WS)',
              }
              const isHealthy = item.status === 'healthy'
              return (
                <div key={item.name} className="group relative">
                  <div className={`absolute inset-0 bg-gradient-to-r ${isHealthy ? 'from-emerald-500/5 to-transparent' : 'from-amber-500/5 to-transparent'} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className={`relative p-4 rounded-2xl border ${isHealthy ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-amber-100 dark:border-amber-900/30'} flex items-start gap-3`}>
                    <div className={`mt-0.5 w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{nameMap[item.name] || item.name}</span>
                        <span className={`text-xs font-black bg-white dark:bg-[#1e1e2d] px-2 py-0.5 rounded-md border ${isHealthy ? 'text-emerald-600 border-emerald-100 dark:border-emerald-900/50' : 'text-amber-600 border-amber-100 dark:border-amber-900/50'}`}>
                          {item.value}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-tight">{item.detail}</p>
                    </div>
                  </div>
                </div>
              )
            })}
            {(!data.systemHealth || data.systemHealth.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-bold text-gray-900 dark:text-white">الأنظمة مستقرة</p>
                <p className="text-xs text-gray-500 mt-1">لا توجد أي تنبيهات حالياً</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Live System Health */}
      <div className="grid md:grid-cols-2 gap-6 pt-2 no-print">
        <LiveSystemHealth />

        {/* Quick Stats Cards */}
        <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> إجراءات سريعة
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/admin/users', icon: UserCheck, label: 'إدارة الحسابات', color: '#ef4444', bg: '#ef444415' },
              { href: '/admin/classes', icon: School, label: 'الفصول الدراسية', color: '#3b82f6', bg: '#3b82f615' },
              { href: '/admin/permissions', icon: Shield, label: 'الصلاحيات', color: '#8b5cf6', bg: '#8b5cf615' },
              { href: '/admin/enrollments', icon: FileText, label: 'التقارير', color: '#f59e0b', bg: '#f59e0b15' },
              { href: '/admin/users?role=TEACHER', icon: GraduationCap, label: 'المعلمون', color: '#0d9488', bg: '#0d948815' },
              { href: '/admin/users?role=STUDENT', icon: Users, label: 'الطلاب', color: '#06b6d4', bg: '#06b6d415' },
            ].map((a, i) => (
              <Link key={i} href={a.href}>
                <motion.div whileHover={{ y: -2, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}
                  className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer border border-gray-100 dark:border-white/5 hover:shadow-md transition-all"
                  style={{ backgroundColor: a.bg }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-[#12121a] shadow-sm">
                    <a.icon className="w-4 h-4" style={{ color: a.color }} />
                  </div>
                  <span className="font-bold text-xs text-gray-900 dark:text-white leading-tight">{a.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      </>)}

      {/* ── ACCOUNTS TAB ── */}
      {adminTab === 'accounts' && (
        <motion.div key="adm-acc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-gradient-to-br from-rose-600 via-pink-600 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg">
            <h2 className="text-2xl font-black mb-1">👥 الحسابات الثمانية المعتمدة للمنصة</h2>
            <p className="text-rose-100 text-sm">إدارة وربط جميع بوابات الدخول الثمانية لنظام Nexus EDU ومطابقتها مع فصل د. إسماعيل</p>
          </div>

          <div className="grid gap-3">
            {[
              { role: 'المعلم', title: 'معلم الفصل والمشرف الأكاديمي', name: 'د. إسماعيل عيسى', email: 'arabic.teacher@nexusedu.sa', path: '/ar/teacher', color: 'from-orange-500 to-amber-600', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', icon: '👨‍🏫' },
              { role: 'الطالب', title: 'طالب متميز — فصل د. إسماعيل', name: 'أحمد فيصل الغامدي', email: 'student1@nexusedu.sa', path: '/ar/student', color: 'from-violet-500 to-purple-600', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400', icon: '👦' },
              { role: 'ولي الأمر', title: 'ولي أمر الطالب أحمد الغامدي', name: 'فيصل الغامدي', email: 'parent1@nexusedu.sa', path: '/ar/parent', color: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', icon: '👨‍👩‍👧' },
              { role: 'مدير المدرسة', title: 'الإدارة العامة والمتابعة الشاملة', name: 'م. أحمد الشمري', email: 'principal@nexusedu.sa', path: '/ar/principal', color: 'from-blue-600 to-indigo-700', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', icon: '🏫' },
              { role: 'وكيل المدرسة', title: 'شؤون الطلاب والانضباط المدرسي', name: 'م. سارة الزهراني', email: 'vice.principal@nexusedu.sa', path: '/ar/vice_principal', color: 'from-pink-600 to-rose-600', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400', icon: '📋' },
              { role: 'التوجيه الطلابي', title: 'الإرشاد النفسي والسلوكي والرفاهية', name: 'أ. خالد المطيري', email: 'counselor@nexusedu.sa', path: '/ar/counselor', color: 'from-teal-600 to-cyan-600', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400', icon: '💚' },
              { role: 'الإشراف التربوي', title: 'تقييم المعلمين وجودة التدريس', name: 'د. فاطمة العتيبي', email: 'supervisor@nexusedu.sa', path: '/ar/supervisor', color: 'from-indigo-600 to-blue-600', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400', icon: '🎯' },
              { role: 'الشؤون الإدارية', title: 'الإدارة المركزية والصلاحيات والأنظمة', name: 'أ. محمد القحطاني', email: 'admin@nexusedu.sa', path: '/ar/admin', color: 'from-slate-700 to-gray-800', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400', icon: '⚙️' },
            ].map((acc, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${acc.color} flex items-center justify-center text-2xl shadow-sm flex-shrink-0 text-white`}>
                    {acc.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-black text-gray-900 dark:text-white text-base">{acc.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${acc.badge}`}>{acc.role}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{acc.title}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{acc.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-bold border border-emerald-200/50">
                    <CheckCircle2 className="w-3.5 h-3.5" /> مفعّل ومرتبط
                  </span>
                  <Link href={acc.path}>
                    <button className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white text-xs font-bold transition-colors">
                      دخول البوابة ↗
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── REPORTS TAB ── */}
      {adminTab === 'reports' && (
        <motion.div key="adm-rep" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-700 rounded-[2rem] p-6 text-white shadow-lg">
            <h2 className="text-2xl font-black mb-1">📈 التقارير الشاملة وإحصاءات المدرسة</h2>
            <p className="text-indigo-100 text-sm">ملخص شامل لأداء فصل د. إسماعيل عيسى ومؤشرات الجودة الأكاديمية</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي الطلاب', val: adminStudents.length || 8, icon: '👥', color: 'from-blue-500 to-indigo-600' },
              { label: 'نسبة الحضور التراكمية', val: `${adminMetrics?.attendanceRate || 97}%`, icon: '📅', color: 'from-teal-500 to-emerald-600' },
              { label: 'المعدل العام للفصل', val: `${adminMetrics?.averageSchoolGrade || 92}%`, icon: '⭐', color: 'from-amber-500 to-orange-600' },
              { label: 'الشهادات الممنوحة', val: adminMetrics?.awardedCertificates || 4, icon: '🏆', color: 'from-purple-500 to-pink-600' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className={`bg-gradient-to-br ${stat.color} rounded-3xl p-5 text-white shadow-sm`}>
                <div className="text-2xl mb-2">{stat.icon}</div>
                <p className="text-2xl font-black">{stat.val}</p>
                <p className="text-xs opacity-90 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              التقارير المتوفرة للتحميل والطباعة
            </h3>
            <div className="space-y-3">
              {[
                { title: 'تقرير الانضباط والحضور الشهري', desc: 'سجل غياب وحضور كامل بالفترات والحصص السبع', type: 'PDF' },
                { title: 'سجل الدرجات والواجبات المدرسية', desc: 'رصد تفصيلي لدرجات واجبات لغتي، القرآن الكريم، والرياضيات', type: 'Excel' },
                { title: 'تقرير الطلاب المتفوقين والمحتاجين لدعم', desc: 'تصنيف الطلاب حسب قائمة الشرف وخطط التحسين الفردية', type: 'PDF' },
                { title: 'كشف الشهادات والأوسمة المعتمدة', desc: 'شهادات التميز الصادرة برقم تسلسلي معتمد من المنصة', type: 'PDF' },
              ].map((rep, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{rep.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{rep.desc}</p>
                  </div>
                  <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-800 dark:text-white hover:bg-gray-100 transition-colors shadow-sm">
                    طباعة / تصدير
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── SYSTEM & DATA TAB ── */}
      {adminTab === 'system' && (
        <motion.div key="adm-sys" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800 via-gray-800 to-zinc-900 rounded-[2rem] p-6 text-white shadow-lg">
            <h2 className="text-2xl font-black mb-1">🏫 فصل د. إسماعيل عيسى ومزامنة البيانات</h2>
            <p className="text-gray-300 text-sm">حالة الربط المركزي، قاعدة البيانات المحلية، وسجلات الطلاب النشطة</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
              <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <School className="w-5 h-5 text-rose-500" />
                معلومات الفصل الدراسي
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 font-medium">اسم الفصل</span>
                  <span className="font-bold text-gray-900 dark:text-white">الصف الأول الابتدائي — فصل د. إسماعيل عيسى</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 font-medium">معلم الفصل</span>
                  <span className="font-bold text-gray-900 dark:text-white">د. إسماعيل عيسى</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 font-medium">المواد المعتمدة</span>
                  <span className="font-bold text-gray-900 dark:text-white">اللغة العربية، القرآن الكريم، الرياضيات، العلوم</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 font-medium">الحصص اليومية</span>
                  <span className="font-bold text-gray-900 dark:text-white">7 حصص تفاعلية (من 06:45 إلى 12:40)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 font-medium">حالة الربط والبيانات</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Nexus Data Bridge نشط 100%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
              <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                قائمة طلاب الفصل الثمانية
              </h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {adminStudents.map((s, idx) => (
                  <div key={s.id || idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{s.fullName}</span>
                    </div>
                    <span className="font-black text-emerald-600">{s.averageGrade}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <SocketProvider>
      <AdminDashboardInner />
    </SocketProvider>
  )
}
