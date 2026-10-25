'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { SocketProvider, useRealtimeAttendance } from '@/lib/providers/socket-provider'
import {
  Calendar, CheckCircle2, XCircle, AlertCircle, Clock, TrendingUp,
  Loader2, RefreshCw, Bell, Award, MapPin, Navigation, ShieldCheck
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useLocale } from 'next-intl'

// Status mapping
const STATUS_CONFIG = {
  PRESENT:  { label: 'حاضر',   color: '#22c55e', icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ABSENT:   { label: 'غائب',   color: '#ef4444', icon: XCircle,      bg: 'bg-rose-50 dark:bg-rose-900/20' },
  LATE:     { label: 'متأخر',  color: '#f59e0b', icon: Clock,        bg: 'bg-amber-50 dark:bg-amber-900/20' },
  EXCUSED:  { label: 'بعذر',   color: '#6b7280', icon: AlertCircle,  bg: 'bg-gray-50 dark:bg-gray-900/20' },
}

function AttendanceDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.EXCUSED
  return (
    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${cfg.bg}`}>
      <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
    </div>
  )
}

function AttendancePageInner() {
  const isEnglish = useLocale() === 'en'
  const t = (arabic: string, english: string) => isEnglish ? english : arabic
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [liveAlert, setLiveAlert] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth())
  const [geofenceState, setGeofenceState] = useState<'checking' | 'outside' | 'error' | 'inside'>('checking')
  const [geofenceError, setGeofenceError] = useState<string | null>(null)
  const [geofenceResult, setGeofenceResult] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const response = await apiClient.get('/attendance')
      setData(response.data)
    } catch {
      setData(null)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyGeofence = useCallback(async (scheduleEventId?: string) => {
    setGeofenceState('checking')
    setGeofenceError(null)
    try {
      if (!navigator.geolocation) {
        throw new Error(t('المتصفح لا يدعم تحديد الموقع. افتح المنصة من متصفح حديث على جهاز يدعم GPS.', 'This browser does not support location. Open the platform in a modern browser on a GPS-enabled device.'));
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, (error) => {
          const messages: Record<number, string> = {
            1: t('إذن الموقع مرفوض. اسمح للمتصفح باستخدام الموقع ثم أعد المحاولة.', 'Location permission was denied. Allow location access in your browser and try again.'),
            2: t('تعذر تحديد الموقع الحالي. فعّل GPS أو خدمات الموقع وحاول مرة أخرى.', 'Could not determine your location. Turn on GPS or location services and try again.'),
            3: t('استغرق تحديد الموقع وقتًا طويلًا. حاول مرة أخرى من مكان مفتوح.', 'Location lookup took too long. Try again from an open area.'),
          };
          reject(new Error(messages[error.code] || t('تعذر قراءة موقعك الحالي.', 'Could not read your current location.')));
        }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      });

      const response = await apiClient.post('/attendance/student/geofence/check-in', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        ...(scheduleEventId ? { scheduleEventId } : {}),
      });
      setGeofenceResult(response.data);
      setGeofenceState('inside');
      await load();
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message;
      const message = Array.isArray(apiMessage) ? apiMessage.join(isEnglish ? ', ' : '، ') : apiMessage;
      setGeofenceError(isEnglish ? 'Could not verify your location. Check your location permission and try again.' : (message || error?.message || 'تعذر التحقق من موقعك. أعد المحاولة.'));
      setGeofenceResult(null);
      setData(null);
      setGeofenceState(error?.response?.status === 403 ? 'outside' : 'error');
    }
  }, [load, isEnglish]);

  useEffect(() => { void verifyGeofence() }, [verifyGeofence])

  useRealtimeAttendance(useCallback((a: any) => {
    if (geofenceState !== 'inside') return
    const msg = a.status === 'PRESENT' ? t('✅ تم تسجيل حضورك اليوم', '✅ Your attendance was recorded today') : t('⚠️ تم تسجيل غيابك اليوم', '⚠️ Your absence was recorded today')
    setLiveAlert(msg)
    setTimeout(() => setLiveAlert(null), 6000)
    load()
  }, [geofenceState, load, isEnglish]))

  if (geofenceState !== 'inside') {
    const checking = geofenceState === 'checking'
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-4" dir={isEnglish ? 'ltr' : 'rtl'}>
        <section className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className={`px-6 py-7 text-white sm:px-8 ${checking ? 'bg-gradient-to-l from-sky-700 to-teal-600' : geofenceState === 'outside' ? 'bg-gradient-to-l from-rose-700 to-orange-600' : 'bg-gradient-to-l from-slate-700 to-slate-600'}`}>
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15">
                {checking ? <Navigation className="size-7 animate-pulse" /> : <MapPin className="size-7" />}
              </div>
              <div>
                <p className="text-sm text-white/75">{t('الحضور الذكي', 'Smart attendance')}</p>
                <h1 className="mt-1 text-xl font-bold sm:text-2xl">{t('التحقق من وجودك داخل المدرسة', 'Verify that you are at school')}</h1>
              </div>
            </div>
          </div>
          <div className="space-y-5 p-6 sm:p-8">
            {checking ? (
              <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                <Loader2 className="size-5 shrink-0 animate-spin" />
                <div><p className="font-semibold">{t('جارٍ تحديد موقعك الحالي…', 'Checking your current location…')}</p><p className="mt-1 text-sm opacity-80">{t('اسمح للمتصفح باستخدام الموقع. يلزم اتصال آمن وخدمة GPS مفعّلة.', 'Allow location access in your browser. A secure connection and GPS must be enabled.')}</p></div>
              </div>
            ) : (
              <div role="alert" className={`rounded-2xl border p-4 ${geofenceState === 'outside' ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100' : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'}`}>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0" />
                  <div><p className="font-semibold">{geofenceState === 'outside' ? t('لا يمكن فتح سجل الحضور من خارج المدرسة', 'Attendance can only be opened from school') : t('تعذر التحقق من الموقع', 'Could not verify your location')}</p><p className="mt-1 text-sm leading-6 opacity-90">{geofenceError}</p></div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-700" />
              <p>{t('يُفتح سجل الحضور عند التحقق من وجود الجهاز داخل نطاق المدرسة المحدد بـ 50 مترًا. الموقع ودقته يُعاد التحقق منهما على الخادم قبل حفظ الحضور.', 'Attendance opens after your device is verified within 50 metres of the school. The server checks your location and its accuracy again before saving attendance.')}</p>
            </div>
            {!checking && <button type="button" onClick={() => void verifyGeofence()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"><RefreshCw className="size-4" />{t('إعادة فحص الموقع', 'Check location again')}</button>}
          </div>
        </section>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
    </div>
  )

  if (loadError || !data?.summary) return (
    <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center gap-3 p-6 text-center">
      <p role="alert" className="text-sm text-rose-600">{t('تعذر تحميل سجل الحضور من المدرسة.', 'Could not load attendance records.')}</p>
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
        <RefreshCw className="h-4 w-4" /> {t('إعادة المحاولة', 'Try again')}
      </button>
    </div>
  )

  const summary = data.summary
  const history: any[] = data?.history || []
  const weeklyOverview: any[] = data?.weeklyOverview || []

  const total = summary.totalDays
  const attendancePct = typeof summary.attendanceRate === 'number' && Number.isFinite(summary.attendanceRate)
    ? summary.attendanceRate
    : null

  // Chart data
  const pieData = [
    { name: t('حاضر', 'Present'), value: summary.present, color: '#22c55e' },
    { name: t('غائب', 'Absent'), value: summary.absent, color: '#ef4444' },
    { name: t('متأخر', 'Late'), value: summary.late, color: '#f59e0b' },
  ].filter(d => d.value > 0)

  // Monthly history
  const monthlyHistory = history.filter((h: any) => {
    const d = new Date(h.date)
    return d.getMonth() === monthFilter
  })

  const MONTHS = isEnglish ? ['January','February','March','April','May','June','July','August','September','October','November','December'] : ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

  return (
    <div className="space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      {/* Live Alert */}
      <AnimatePresence>
        {liveAlert && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold">
            <Bell className="w-4 h-4" /> {liveAlert}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><MapPin className="size-5" /></div>
            <div><h2 className="font-bold text-foreground">{t('الحضور من موقع المدرسة', 'Attendance from school location')}</h2><p className="mt-0.5 text-xs text-muted-foreground">{t('نطاق التسجيل', 'Check-in radius')} {geofenceResult?.radiusMeters ?? 50} {t('متر حول المدرسة', 'metres around school')}</p></div>
          </div>
          <div className="text-left text-xs text-muted-foreground">
            <p>{t('المسافة:', 'Distance:')} <strong className="text-foreground">{geofenceResult?.distanceMeters ?? '—'} {t('م', 'm')}</strong></p>
            <p className="mt-1">{t('دقة الموقع:', 'Location accuracy:')} ±{geofenceResult?.accuracyMeters ?? '—'} {t('م', 'm')}</p>
          </div>
        </div>

        <div className="space-y-3 p-5">
          {geofenceResult?.checkIn ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div><p className="font-semibold">{geofenceResult.checkIn.alreadyRecorded ? t('حضورك مسجل بالفعل', 'Your attendance is already recorded') : t('تم تسجيل حضورك في الحصة', 'You have been checked in for this class')}</p><p className="mt-1 text-sm">{geofenceResult.checkIn.subjectName} · {t('الحصة', 'Period')} {geofenceResult.checkIn.periodNumber} · {geofenceResult.checkIn.className}</p></div>
            </div>
          ) : geofenceResult?.requiresPeriodSelection ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('هناك أكثر من حصة في فصولك الآن. اختر حصتك ليُسجل حضورك، وسيُعاد فحص موقعك قبل الحفظ.', 'You have more than one class now. Select your class to check in. Your location will be checked again before saving.')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {geofenceResult.currentPeriods.map((period: any) => (
                  <button key={period.scheduleEventId} type="button" disabled={period.alreadyRecorded} onClick={() => void verifyGeofence(period.scheduleEventId)} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-right transition hover:border-teal-500 hover:bg-teal-50/60 disabled:cursor-default disabled:opacity-60 dark:hover:bg-teal-950/20">
                    <span><span className="block text-sm font-semibold text-foreground">{period.subjectName} · {t('الحصة', 'Period')} {period.periodNumber}</span><span className="mt-1 block text-xs text-muted-foreground">{period.className} · {period.startTime}–{period.endTime}</span></span>
                    <span className="shrink-0 text-xs font-semibold text-teal-700 dark:text-teal-300">{period.alreadyRecorded ? t('تم التسجيل', 'Recorded') : t('تسجيل الحضور', 'Check in')}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : geofenceResult?.currentPeriods?.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-700" />
              <div><p className="font-semibold">{t('تم التحقق من وجودك داخل المدرسة', 'Your location at school has been verified')}</p><p className="mt-1 text-sm">{t('لا توجد حصة مجدولة لك في الوقت الحالي. يمكنك متابعة سجل الحضور المسجل أدناه.', 'You have no class scheduled right now. You can review your attendance history below.')}</p></div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-teal-200 text-sm mb-1">{t('سجل الحضور والغياب المباشر', 'Live attendance record')}</p>
            <h1 className="text-3xl font-extrabold mb-3">{t('متابعة الحضور الدراسي', 'Attendance tracking')}</h1>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: t('أيام الحضور', 'Days present'), value: summary.present, color: '#4ade80' },
                { label: t('أيام الغياب', 'Days absent'), value: summary.absent, color: '#f87171' },
                { label: t('التأخر', 'Late arrivals'), value: summary.late, color: '#fbbf24' },
              ].map((s, i) => (
                <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                  <p className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-white/70">{s.label}</p>
                </div>
              ))}
            </div>
            
          </div>

          {/* Attendance Ring */}
          <div className="relative hidden md:block">
            <svg width={100} height={100} className="-rotate-90">
              <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={8} />
              <motion.circle cx={50} cy={50} r={42} fill="none"
                stroke={total === 0 || attendancePct === null ? 'rgba(255,255,255,0.3)' : attendancePct >= 90 ? '#4ade80' : attendancePct >= 75 ? '#fbbf24' : '#f87171'}
                strokeWidth={8} strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: total === 0 || attendancePct === null ? 2 * Math.PI * 42 : 2 * Math.PI * 42 * (1 - attendancePct / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-white">{total === 0 || attendancePct === null ? '—' : `${attendancePct}%`}</span>
              <span className="text-xs text-white/70">{t('الحضور', 'Attendance')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Donut */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-3xl p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-500" /> {t('توزيع الحضور', 'Attendance breakdown')}
          </h3>
          {total > 0 && pieData.length > 0 ? (
            <>
              <div className="relative" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                      paddingAngle={3} dataKey="value" stroke="none">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-foreground">{total}</span>
                  <span className="text-xs text-muted-foreground">{t('يوم', 'days')}</span>
                </div>
              </div>
              <div className="flex justify-center gap-5 mt-3">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center space-y-2">
              <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground text-sm font-bold">{t('لا توجد سجلات حضور مسجلة بعد', 'No attendance records yet')}</p>
              <p className="text-xs text-muted-foreground/70">{t('تُسجّل المدرسة الحضور من حساب المعلم أو الإدارة.', 'The school records attendance through teacher or administrator accounts.')}</p>
            </div>
          )}
        </motion.div>

        {/* Status card */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-3xl p-6 flex flex-col gap-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> {t('حالتك الراهنة', 'Current status')}
          </h3>
          {total === 0 ? (
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">{t('لا توجد سجلات حضور', 'No attendance records')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('لم تسجل المدرسة حضورًا أو غيابًا لهذا الحساب حتى الآن.', 'The school has not recorded attendance or absences for this account yet.')}</p>
              </div>
            </div>
          ) : attendancePct === null ? (
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">{t('نسبة الحضور غير متاحة', 'Attendance rate unavailable')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('لا توجد بيانات كافية لحساب النسبة.', 'There is not enough data to calculate a rate.')}</p>
              </div>
            </div>
          ) : attendancePct >= 90 ? (
            <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{t('ممتاز! حضورك منتظم', 'Excellent! Your attendance is consistent')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('احتفظ بهذا المستوى للحصول على أفضل النتائج الأكاديمية.', 'Keep it up to support your academic progress.')}</p>
              </div>
            </div>
          ) : attendancePct >= 75 ? (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">{t('تنبيه: الحضور يحتاج إلى تحسين', 'Notice: attendance needs improvement')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(`نسبة حضورك ${attendancePct}%. احرص على الحضور اليومي المنتظم.`, `Your attendance rate is ${attendancePct}%. Try to attend regularly each day.`)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4">
              <XCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-rose-700 dark:text-rose-400 text-sm">{t('تحذير: نسبة حضور منخفضة', 'Warning: low attendance rate')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(`نسبة حضورك ${attendancePct}%. تواصل مع إدارة المدرسة لتبرير الغياب.`, `Your attendance rate is ${attendancePct}%. Contact the school office about any absences.`)}</p>
              </div>
            </div>
          )}

          {/* Weekly Summary */}
          {weeklyOverview.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">{t('أحدث أيام الحضور', 'Recent attendance days')}</p>
              <div className="flex gap-2">
                {weeklyOverview.map((w: any, i: number) => {
                  const cfg = STATUS_CONFIG[(w.status?.toUpperCase() as keyof typeof STATUS_CONFIG)] ?? STATUS_CONFIG.EXCUSED
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cfg.color}15` }}>
                        <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground font-bold">{w.day || w.date}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* History Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-500" /> {t('السجل التفصيلي', 'Detailed record')}
          </h3>
          <div className="flex items-center gap-2">
            <select value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))}
              className="text-xs bg-muted border border-border rounded-xl px-3 py-1.5 outline-none text-foreground">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <button onClick={load} className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {monthlyHistory.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 opacity-30" />
            <p className="text-sm font-bold">{t('لا توجد سجلات حضور مسجلة لهذا الشهر', 'No attendance records for this month')}</p>
            <p className="text-xs text-muted-foreground/60">{t('يتم تسجيل الحضور تلقائياً عند مسح رمز QR أو تأكيد الحضور الذكي', 'Attendance is recorded automatically when a QR code is scanned or smart attendance is confirmed.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {monthlyHistory.map((h: any, i: number) => {
              const status = h.status?.toUpperCase() as keyof typeof STATUS_CONFIG
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.EXCUSED
              const dateStr = new Date(h.date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                  <AttendanceDot status={status} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{dateStr}</p>
                    <p className="text-xs text-muted-foreground">{h.subject || t('سجل مدرسي', 'School record')}</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}>
                    {cfg.label}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default function AttendancePage() {
  return (
    <SocketProvider>
      <AttendancePageInner />
    </SocketProvider>
  )
}
