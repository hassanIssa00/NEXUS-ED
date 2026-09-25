'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboardApi } from '@/lib/api/dashboard';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';
import { SocketProvider, useRealtimeNotifications, useRealtimeAttendance } from '@/lib/providers/socket-provider';
import {
  Users, UserCheck, UserX, Calendar, AlertTriangle, ClipboardList,
  FileText, MessageSquare, Shield, Zap, Bell, RefreshCw, BookOpen,
  Activity, CheckCircle2, Clock, Loader2, BrainCircuit, Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ title, value, icon: Icon, color, bg, border, sub }: {
  title: string; value: string | number; icon: any; color: string; bg: string; border: string; sub?: string
}) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}
      className={`bg-white dark:bg-[#1e1e2d] border ${border} rounded-[2rem] p-6 shadow-sm relative overflow-hidden group`}>
      <div className={`absolute -top-10 -right-10 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl rounded-full ${bg}`} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
        <div>
          <p className="text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">{value}</p>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{title}</p>
          {sub && <p className="text-[10px] font-medium text-gray-400 mt-1">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function VPDashboardInner() {
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveNotif, setLiveNotif] = useState<string | null>(null);
  const [liveAtt, setLiveAtt] = useState<any>(null);
  const [attLog, setAttLog] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [vpTab, setVpTab] = useState<'dashboard' | 'attendance' | 'discipline' | 'students'>('dashboard');
  const [vpStudents, setVpStudents] = useState<any[]>([]);
  const [vpTodayAtt, setVpTodayAtt] = useState<any[]>([]);
  const [vpObs, setVpObs] = useState<any[]>([]);
  const { signOut } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge');
      const metrics = nexusBridge.getSchoolMetrics();
      const students = nexusBridge.getStudents();
      const todayAtt = nexusBridge.getTodayAttendance();
      const obs = nexusBridge.getObservations();

      setVpStudents(students);
      setVpTodayAtt(todayAtt);
      setVpObs(obs);

      const d = {
        kpis: {
          totalStudents: metrics.totalStudents,
          activeUsers: metrics.presentToday || metrics.totalStudents,
          totalClasses: 1,
          totalTeachers: 1,
          attendanceRate: metrics.attendanceRate,
          supportNeeded: metrics.supportNeededStudents,
        },
        recentActivity: [
          { text: `تم تسجيل حضور ${metrics.presentToday} طلاب اليوم في فصل د. إسماعيل عيسى` },
          { text: `نسبة الحضور التراكمية للفصل: ${metrics.attendanceRate}%` },
          ...obs.map(o => ({ text: `${o.studentName}: ${o.text}` })),
        ],
        recentIssues: obs.filter(o => o.category === 'guidance' || o.severity === 'urgent').map(o => ({
          student: o.studentName,
          issue: o.text,
          type: o.category === 'guidance' ? 'إرشاد' : 'انضباط',
          severity: o.severity === 'urgent' ? 'high' : 'medium',
        })),
        metrics,
      };
      setAdminData(d);
    } catch (e) {
      console.error('nexusBridge VP load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('nexus:data-changed', load as any);
    return () => window.removeEventListener('nexus:data-changed', load as any);
  }, [load]);

  useRealtimeNotifications(useCallback((n: any) => {
    setLiveNotif(n.title); setTimeout(() => setLiveNotif(null), 5000);
  }, []));

  useRealtimeAttendance(useCallback((a: any) => {
    setLiveAtt(a);
    setAttLog(prev => [a, ...prev].slice(0, 10));
    setTimeout(() => setLiveAtt(null), 4000);
  }, []));

  const generateAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await apiClient.post('/ai/ask', {
        question: `أنت مساعد وكيل مدرسة ذكي. مهمتك تحليل الانضباط والغياب. بناءً على هذا السجل القصير للغياب اليوم: ${JSON.stringify(attLog.slice(0,5))}. أعطني توقعاً واحداً وتوصية واحدة سريعة للتعامل مع المتغيبين.`
      });
      setAiAnalysis(res.data?.data?.answer || 'تعذر توليد التحليل.');
    } catch { setAiAnalysis('تأكد من اتصال خدمة الذكاء الاصطناعي.'); }
    finally { setAiLoading(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-20 h-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 border-4 border-pink-500/20 border-t-pink-500 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Shield className="w-8 h-8 text-pink-500 animate-pulse" />
        </div>
      </div>
      <p className="text-sm font-bold text-gray-500">جاري مزامنة بيانات المدرسة...</p>
    </div>
  );

  const kpis = adminData?.kpis || {};
  const totalStudents = kpis.totalStudents || 450;
  const activeUsers = kpis.activeUsers || 410;
  const totalClasses = kpis.totalClasses || 15;

  // Build chart data from activity
  const activityData = (adminData?.recentActivity || []).slice(0, 7).map((a: any, i: number) => ({
    name: `#${i + 1}`,
    إجراءات: Math.floor(Math.random() * 10) + 1
  }));

  const recentIssues = [
    { student: 'طالب - غياب مكرر', issue: 'لم يحضر خلال 3 أيام', type: 'غياب', severity: 'high' },
    { student: 'حالة سلوكية', issue: 'مشكلة في الفصل', type: 'انضباط', severity: 'medium' },
    { student: 'شكوى ولي أمر', issue: 'استفسار عن الدرجات', type: 'شكوى', severity: 'low' },
  ];

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Live Toasts */}
      <AnimatePresence>
        {(liveNotif || liveAtt) && (
          <motion.div initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold">
            {liveAtt ? (
              <>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${liveAtt.status === 'ABSENT' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600' : 'bg-teal-100 dark:bg-teal-500/20 text-teal-600'}`}>
                  {liveAtt.status === 'ABSENT' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>
                <span className="text-gray-900 dark:text-white">
                  {liveAtt.status === 'ABSENT' ? '⚠️ غياب' : '✅ حضور'}: {liveAtt.studentName || 'طالب'}
                </span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-gray-900 dark:text-white">{liveNotif}</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-pink-600 via-rose-600 to-red-600 p-8 md:p-10 text-white shadow-2xl">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-40 -right-40 w-[400px] h-[400px] bg-yellow-300/30 rounded-full blur-3xl" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -left-20 w-[300px] h-[300px] bg-white/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4">
              <Shield className="w-3 h-3 text-pink-200" />
              <span className="text-xs font-bold text-pink-100">بوابة وكيل المدرسة</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">الإشراف والمتابعة 📋</h1>
            <p className="text-white/80 text-sm md:text-base font-medium max-w-xl leading-relaxed mb-6">
              شؤون الطلاب، الانضباط المدرسي، ومتابعة الحضور المباشرة لحظة بلحظة.
            </p>
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Users, label: `${totalStudents} طالب مسجل` },
                { icon: Activity, label: `${activeUsers} حالة نشطة اليوم` },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-3 border border-white/10 transition-colors shadow-sm">
                  <s.icon className="w-4 h-4 text-white" />
                  <span className="text-sm font-black">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <button onClick={() => signOut()} className="flex items-center gap-2 px-6 py-2.5 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 rounded-xl font-bold text-sm transition-colors border border-rose-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                تسجيل الخروج
              </button>
            </div>
          </div>

          {/* AI Forecaster */}
          <div className="w-full md:w-80 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <h3 className="font-black text-white text-sm mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-yellow-300" />
                </div>
                محلل الانضباط الذكي
              </h3>
              <div className="bg-black/20 rounded-xl p-4 border border-white/10 min-h-[100px] flex flex-col justify-center">
                {aiAnalysis ? (
                  <p className="text-[13px] text-white/90 leading-relaxed font-medium">{aiAnalysis}</p>
                ) : (
                  <button onClick={generateAiAnalysis} disabled={aiLoading}
                    className="w-full bg-pink-500 hover:bg-pink-600 py-3 rounded-xl text-xs font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-white">
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {aiLoading ? 'جاري تحليل الأنماط...' : 'توقع حالات الغياب'}
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
          { key: 'dashboard', label: '📊 لوحة التحكم', icon: Activity },
          { key: 'attendance', label: '📅 سجل الحضور اليومي', icon: Calendar },
          { key: 'discipline', label: '🛡️ الانضباط والمتابعات', icon: Shield },
          { key: 'students', label: '👥 قائمة الطلاب', icon: Users },
        ].map(t => (
          <button key={t.key} onClick={() => setVpTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              vpTab === t.key ? 'bg-white dark:bg-[#1e1e2d] text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {vpTab === 'dashboard' && (<>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي الطلاب" value={totalStudents} icon={Users} color="text-pink-600 dark:text-pink-400" bg="bg-pink-50 dark:bg-pink-500/10" border="border-pink-100 dark:border-pink-500/20" />
        <StatCard title="الحضور الفعلي اليوم" value={activeUsers} icon={UserCheck} color="text-teal-600 dark:text-teal-400" bg="bg-teal-50 dark:bg-teal-500/10" border="border-teal-100 dark:border-teal-500/20"
          sub={totalStudents > 0 ? `${Math.round((activeUsers / totalStudents) * 100)}% نسبة الحضور` : undefined} />
        <StatCard title="الفصول النشطة" value={totalClasses} icon={ClipboardList} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-500/10" border="border-indigo-100 dark:border-indigo-500/20" />
        <StatCard title="إجمالي المعلمين" value={kpis.totalTeachers || 32} icon={BookOpen} color="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-500/10" border="border-violet-100 dark:border-violet-500/20" />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-pink-500" />
              </div>
              نشاط النظام اليومي
            </h3>
          </div>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip cursor={{ fill: 'rgba(236,72,153,0.1)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="إجراءات" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[{name: 'الاحد', إجراءات: 12}, {name: 'الاثنين', إجراءات: 19}, {name: 'الثلاثاء', إجراءات: 15}, {name: 'الاربعاء', إجراءات: 22}]} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip cursor={{ fill: 'rgba(236,72,153,0.1)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="إجراءات" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Issues List */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-amber-50/50 dark:bg-amber-900/10">
            <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              الحالات والمتابعات
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {recentIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#12121a] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-amber-200 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${
                  issue.severity === 'high' ? 'bg-rose-500 shadow-rose-500/50' : issue.severity === 'medium' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-blue-500 shadow-blue-500/50'
                }`} />
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">{issue.student}</p>
                  <p className="text-xs text-gray-500 font-medium">{issue.issue}</p>
                  <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                    issue.type === 'غياب' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                    issue.type === 'انضباط' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}>{issue.type}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Live Attendance Log + Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Attendance Stream */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm overflow-hidden flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-teal-50/50 dark:bg-teal-900/10">
            <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center relative">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#1e1e2d] animate-pulse" />
              </div>
              سجل الحضور المباشر
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {attLog.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-10 text-gray-400">
                <Clock className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-bold">في انتظار تسجيلات الحضور اليوم...</p>
              </div>
            )}
            <AnimatePresence>
              {attLog.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-[#12121a] rounded-xl border border-gray-100 dark:border-white/5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.status === 'PRESENT' ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-600' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600'}`}>
                    {a.status === 'PRESENT' ? <CheckCircle2 className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{a.studentName || 'طالب'}</p>
                    <p className="text-xs text-gray-500">{a.className || 'الفصل غير محدد'}</p>
                  </div>
                  <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg ${a.status === 'PRESENT' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-100 dark:border-teal-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-100 dark:border-rose-800'}`}>
                    {a.status === 'PRESENT' ? 'حاضر' : 'غائب'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Recent Audit Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm overflow-hidden flex flex-col min-h-[350px]">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-violet-50/50 dark:bg-violet-900/10 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-violet-600" />
              </div>
              سجل النشاط الإداري
            </h3>
            <button onClick={load} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(adminData?.recentActivity || []).slice(0, 8).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-[#12121a] rounded-xl border border-gray-100 dark:border-white/5 hover:border-violet-200 dark:hover:border-violet-800 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm">
                  {(item.actor || 'م')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.actor || 'مستخدم'}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{item.action}</p>
                </div>
                <p className="text-[10px] font-bold text-gray-400 bg-white dark:bg-[#1e1e2d] px-2 py-1 rounded-lg border border-gray-100 dark:border-white/5 flex-shrink-0">
                  {new Date(item.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
            {(!adminData?.recentActivity || adminData.recentActivity.length === 0) && (
              <div className="flex flex-col gap-3">
                 {[
                   { action: 'تعديل جدول الحصص الأسبوعي', actor: 'يوسف عبدالله', time: '10:30 ص' },
                   { action: 'تسجيل حالة غياب مكررة للطالب أحمد', actor: 'نورة سعد', time: '09:15 ص' },
                   { action: 'تحديث بيانات التواصل لأولياء الأمور', actor: 'يوسف عبدالله', time: '08:45 ص' }
                 ].map((item, i) => (
                   <div key={`mock-${i}`} className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-[#12121a] rounded-xl border border-gray-100 dark:border-white/5 hover:border-violet-200 dark:hover:border-violet-800 transition-colors">
                     <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm">{item.actor[0]}</div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.actor}</p>
                       <p className="text-xs text-gray-500 font-medium mt-0.5">{item.action}</p>
                     </div>
                     <p className="text-[10px] font-bold text-gray-400 bg-white dark:bg-[#1e1e2d] px-2 py-1 rounded-lg border border-gray-100 dark:border-white/5 flex-shrink-0">{item.time}</p>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
        {[
          { icon: Shield, label: 'سجل الانضباط', color: '#ec4899', bg: 'bg-pink-50 dark:bg-pink-500/10' },
          { icon: MessageSquare, label: 'إشعارات أولياء الأمور', color: '#10b981', bg: 'bg-teal-50 dark:bg-teal-500/10' },
          { icon: FileText, label: 'تقرير الغياب', color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { icon: Zap, label: 'إجراءات طارئة', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((action, i) => (
          <motion.div key={i} whileHover={{ scale: 1.03, y: -2 }} transition={{ type: 'spring', stiffness: 300 }}
            className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all ${action.bg}`}>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#12121a] flex items-center justify-center shadow-sm">
              <action.icon className="w-5 h-5" style={{ color: action.color }} />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{action.label}</h4>
          </motion.div>
        ))}
      </div>
      </>)}

      {/* ── ATTENDANCE TAB ── */}
      {vpTab === 'attendance' && (
        <motion.div key="vp-att" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-gradient-to-br from-rose-600 via-pink-600 to-red-600 rounded-[2rem] p-6 text-white shadow-lg">
            <h2 className="text-2xl font-black mb-1">📅 سجل الحضور اليومي للمدرسة</h2>
            <p className="text-rose-100 text-sm">متابعة حضور وانصراف طلاب فصل د. إسماعيل عيسى بالكامل</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm text-center">
              <p className="text-3xl font-black text-teal-600 leading-none mb-1">
                {vpStudents.filter((_, i) => i < 7).length}
              </p>
              <p className="text-xs font-bold text-gray-500">حاضرون اليوم</p>
            </div>
            <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm text-center">
              <p className="text-3xl font-black text-rose-600 leading-none mb-1">
                {Math.max(0, vpStudents.length - 7)}
              </p>
              <p className="text-xs font-bold text-gray-500">غياب بدون عذر</p>
            </div>
            <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm text-center">
              <p className="text-3xl font-black text-indigo-600 leading-none mb-1">
                {adminData?.metrics?.attendanceRate || 97}%
              </p>
              <p className="text-xs font-bold text-gray-500">نسبة الانضباط التراكمية</p>
            </div>
          </div>

          <div className="space-y-3">
            {vpStudents.map((student, i) => {
              const attRecord = vpTodayAtt.find((a: any) => a.studentId === student.id);
              const status = attRecord?.overallStatus || (i < 7 ? 'present' : 'absent');
              return (
                <motion.div key={student.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                  className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                    status === 'present' ? 'bg-teal-100 dark:bg-teal-500/10 text-teal-600' :
                    status === 'late' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
                    'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                  }`}>
                    {status === 'present' ? '✅' : status === 'late' ? '⏰' : '❌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-gray-900 dark:text-white truncate">{student.fullName}</h3>
                    <p className="text-xs text-gray-500">{student.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى'}</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="text-sm font-black text-gray-900 dark:text-white">{student.attendanceRate || 97}%</p>
                    <p className="text-[10px] text-gray-400 font-bold">معدل الحضور</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                    status === 'present' ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' :
                    status === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                    'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                  }`}>
                    {status === 'present' ? 'حاضر' : status === 'late' ? 'متأخر' : 'غائب'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── DISCIPLINE TAB ── */}
      {vpTab === 'discipline' && (
        <motion.div key="vp-disc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 rounded-[2rem] p-6 text-white shadow-lg">
            <h2 className="text-2xl font-black mb-1">🛡️ سجل الانضباط والملاحظات</h2>
            <p className="text-amber-100 text-sm">متابعة السلوك والانضباط الصفي والمدرسي اليومي</p>
          </div>

          <div className="space-y-3">
            {vpObs.length > 0 ? (
              vpObs.map((obs, i) => (
                <motion.div key={obs.id || i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${
                      obs.severity === 'urgent' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10' :
                      obs.severity === 'positive' ? 'bg-teal-100 text-teal-600 dark:bg-teal-500/10' :
                      'bg-amber-100 text-amber-600 dark:bg-amber-500/10'
                    }`}>
                      {obs.severity === 'urgent' ? '⚠️' : obs.severity === 'positive' ? '⭐' : '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-black text-sm text-gray-900 dark:text-white">{obs.studentName}</h4>
                        <span className="text-[10px] text-gray-400 font-bold">
                          {new Date(obs.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">{obs.text}</p>
                      <div className="mt-2 flex gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg ${
                          obs.category === 'behavior' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                          obs.category === 'academic' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        }`}>
                          {obs.category === 'behavior' ? 'انضباط وسلوك' : obs.category === 'academic' ? 'تحصيل دراسي' : 'توجيه وإرشاد'}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">بواسطة: د. إسماعيل عيسى</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white/80 dark:bg-[#1e1e2d]/80 rounded-3xl p-12 text-center text-gray-500">
                <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-3" />
                <p className="font-bold">سجل الانضباط نظيف ومثالي اليوم!</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── STUDENTS TAB ── */}
      {vpTab === 'students' && (
        <motion.div key="vp-stud" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-[2rem] p-6 text-white shadow-lg">
            <h2 className="text-2xl font-black mb-1">👥 قائمة طلاب المدرسة</h2>
            <p className="text-indigo-100 text-sm">متابعة عامة لجميع الطلاب المسجلين وحالاتهم</p>
          </div>

          <div className="grid gap-3">
            {vpStudents.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2 }}
                className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {s.fullName?.[0] || 'ط'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900 dark:text-white truncate">{s.fullName}</h3>
                  <p className="text-xs text-gray-500 font-medium">ولي الأمر: {s.parentName || `ولي أمر ${s.fullName}`}</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className={`text-base font-black ${s.averageGrade >= 90 ? 'text-teal-600' : s.averageGrade >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {s.averageGrade || 90}%
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold">المعدل</p>
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  s.status === 'excellent' ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' :
                  s.status === 'warning' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                }`}>
                  {s.status === 'excellent' ? '🌟 متفوق' : s.status === 'warning' ? '⚠️ يحتاج دعم' : 'منتظم'}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function VicePrincipalDashboard() {
  return (
    <SocketProvider>
      <VPDashboardInner />
    </SocketProvider>
  );
}
