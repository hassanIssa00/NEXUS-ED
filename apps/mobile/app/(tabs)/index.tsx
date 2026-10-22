import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppPage, BrandHeader, EmptyState, ErrorNotice, SectionHeading, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

type Dashboard = {
  student?: { name?: string; avatar?: string | null; classes?: Array<{ id: string; name: string; teacher?: string | null }> };
  teacher?: { name?: string; avatar?: string | null; avatarUrl?: string | null; avatar_url?: string | null };
  admin?: { name?: string };
  summary?: Record<string, number | null>;
  kpis?: Record<string, number | null>;
  upcomingAssignments?: Array<{ id: string; title: string; subject?: string | { name: string }; dueDate?: string | null }>;
  recentAssignments?: Array<{ id: string; title: string; subject?: string | { name: string }; dueDate?: string | null }>;
  classPerformance?: Array<{ id: string; name: string; studentCount: number; subjectCount?: number; averageGrade: number | null }>;
  gradingQueue?: Array<{ id: string; student?: { name?: string; email?: string }; assignment?: { title?: string } }>;
  interventionAlerts?: Array<{ id: string; title: string; body: string; createdAt?: string }>;
  children?: Array<{ id: string; name: string; avatar?: string | null; className: string | null; averageGrade: number | null; attendanceRate: number | null }>;
  customMetrics?: Array<{ label: string; value: string | number }>;
};

type ScheduleEvent = {
  id: string;
  dayOfWeek: number;
  periodNumber?: number | null;
  startTime: string;
  endTime: string;
  class?: { name?: string };
  subject?: { name?: string };
};

type HomeAction = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  href?: '/(tabs)/workspace' | '/(tabs)/reports' | '/(tabs)/assistant' | '/(tabs)/chat' | '/(tabs)/profile';
  tab?: string;
  color: string;
  background: string;
};

const endpointByRole: Record<string, string> = {
  STUDENT: '/dashboard/student', PARENT: '/dashboard/parent', TEACHER: '/dashboard/teacher',
  ADMIN: '/dashboard/admin', PRINCIPAL: '/dashboard/admin', VICE_PRINCIPAL: '/dashboard/admin',
};
const roleLabels: Record<string, string> = {
  STUDENT: 'بوابة الطالب', PARENT: 'بوابة ولي الأمر', TEACHER: 'بوابة المعلم', ADMIN: 'إدارة المدرسة',
  PRINCIPAL: 'مدير المدرسة', VICE_PRINCIPAL: 'وكيل المدرسة', COUNSELOR: 'التوجيه الطلابي',
  SUPERVISOR: 'الإشراف التربوي', ACCOUNTANT: 'المحاسبة المالية', HR: 'الموارد البشرية',
};
const metricLabels: Record<string, string> = {
  totalSubjects: 'المواد', pendingAssignments: 'واجبات مطلوبة', completedAssignments: 'واجبات مكتملة',
  attendanceRate: 'نسبة الحضور', averageGrade: 'متوسط الدرجات', totalClasses: 'الفصول', totalStudents: 'الطلاب',
  totalAssignments: 'الواجبات', totalLessons: 'الدروس', pendingSubmissions: 'بانتظار التصحيح',
  totalUsers: 'الحسابات', totalTeachers: 'المعلمون', activeUsers: 'حسابات نشطة',
};

function readableError(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر تحميل لوحة الحساب. تحقق من الاتصال ثم حاول مجددًا.';
}

function valueLabel(key: string, value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  if (/rate|grade/i.test(key)) return `${Math.round(value)}٪`;
  return value.toLocaleString('ar-SA');
}

function actionsForRole(role: string | undefined): HomeAction[] {
  if (role === 'TEACHER') return [
    { label: 'فصولي', icon: 'people-outline', tab: 'classes', color: BRAND.teal, background: BRAND.tealSoft },
    { label: 'إنشاء واجب', icon: 'document-text-outline', tab: 'assignments', color: BRAND.blue, background: BRAND.blueSoft },
    { label: 'الحضور', icon: 'calendar-outline', tab: 'attendance', color: BRAND.amber, background: BRAND.amberSoft },
    { label: 'أدوات نكسس', icon: 'sparkles-outline', tab: 'tools', color: '#7156B8', background: '#F1ECFF' },
  ];
  if (role === 'PARENT') return [
    { label: 'الأبناء', icon: 'people-outline', href: '/(tabs)/workspace', color: BRAND.teal, background: BRAND.tealSoft },
    { label: 'التقارير', icon: 'bar-chart-outline', href: '/(tabs)/reports', color: BRAND.blue, background: BRAND.blueSoft },
    { label: 'الرسائل', icon: 'chatbubble-ellipses-outline', href: '/(tabs)/chat', color: BRAND.amber, background: BRAND.amberSoft },
    { label: 'مساعد نكسس', icon: 'sparkles-outline', href: '/(tabs)/assistant', color: '#7156B8', background: '#F1ECFF' },
  ];
  if (role === 'STUDENT') return [
    { label: 'مواد وواجبات', icon: 'book-outline', href: '/(tabs)/workspace', color: BRAND.teal, background: BRAND.tealSoft },
    { label: 'التقارير', icon: 'bar-chart-outline', href: '/(tabs)/reports', color: BRAND.blue, background: BRAND.blueSoft },
    { label: 'الرسائل', icon: 'chatbubble-ellipses-outline', href: '/(tabs)/chat', color: BRAND.amber, background: BRAND.amberSoft },
    { label: 'مساعد نكسس', icon: 'sparkles-outline', href: '/(tabs)/assistant', color: '#7156B8', background: '#F1ECFF' },
  ];
  return [
    { label: 'مساحة العمل', icon: 'grid-outline', href: '/(tabs)/workspace', color: BRAND.teal, background: BRAND.tealSoft },
    { label: 'التقارير', icon: 'bar-chart-outline', href: '/(tabs)/reports', color: BRAND.blue, background: BRAND.blueSoft },
    { label: 'مساعد نكسس', icon: 'sparkles-outline', href: '/(tabs)/assistant', color: '#7156B8', background: '#F1ECFF' },
    { label: 'حسابي', icon: 'person-circle-outline', href: '/(tabs)/profile', color: BRAND.amber, background: BRAND.amberSoft },
  ];
}

function TodayLessonCard({ onPress }: { onPress: () => void }) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get<Record<string, ScheduleEvent[]> | { data?: Record<string, ScheduleEvent[]> }>('/schedule/my')
      .then(({ data }) => {
        const grouped = (data as { data?: Record<string, ScheduleEvent[]> })?.data ?? data as Record<string, ScheduleEvent[]>;
        const list = Object.entries(grouped ?? {}).flatMap(([day, items]) =>
          (Array.isArray(items) ? items : []).map((event) => ({ ...event, dayOfWeek: Number(day) })),
        );
        if (active) { setEvents(list.sort((a, b) => a.startTime.localeCompare(b.startTime))); setFailed(false); }
      })
      .catch(() => { if (active) { setEvents([]); setFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayEvents = events.filter((event) => event.dayOfWeek === now.getDay());
  const lesson = todayEvents.find((event) => {
    const start = timeMinutes(event.startTime);
    const end = timeMinutes(event.endTime);
    return start !== null && end !== null && start <= nowMinutes && nowMinutes < end;
  }) ?? todayEvents.find((event) => {
    const start = timeMinutes(event.startTime);
    return start !== null && start > nowMinutes;
  });
  const live = Boolean(lesson && timeMinutes(lesson.startTime)! <= nowMinutes);
  const dayName = now.toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long' });

  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.9} onPress={onPress} style={[styles.lessonCard, live && styles.lessonCardLive]}>
      <View style={[styles.lessonIcon, live && styles.lessonIconLive]}>
        <Ionicons name={live ? 'radio-outline' : 'calendar-outline'} size={22} color={live ? '#FFFFFF' : BRAND.teal} />
      </View>
      <View style={styles.lessonCopy}>
        <View style={styles.lessonHeading}>
          <Text style={[styles.lessonEyebrow, live && styles.lessonEyebrowLive]}>{live ? 'الحصة جارية الآن' : 'الحصة القادمة'} · {dayName}</Text>
          {live ? <View style={styles.liveBadge}><View style={styles.liveBadgeDot} /><Text style={styles.liveBadgeText}>مباشر</Text></View> : null}
        </View>
        <Text numberOfLines={1} style={[styles.lessonTitle, live && styles.lessonTitleLive]}>
          {loading ? 'نحمّل جدولك الدراسي…' : failed ? 'تعذر تحميل الجدول الآن' : lesson?.subject?.name ?? (todayEvents.length ? 'انتهت حصص اليوم' : 'لا توجد حصة مسجلة اليوم')}
        </Text>
        <Text style={[styles.lessonMeta, live && styles.lessonMetaLive]}>
          {lesson ? `${lesson.periodNumber ? `الحصة ${lesson.periodNumber} · ` : ''}${lesson.startTime} – ${lesson.endTime}${lesson.class?.name ? ` · ${lesson.class.name}` : ''}` : 'اضغط لفتح جدولك الدراسي'}
        </Text>
      </View>
      <Ionicons name="chevron-back" size={19} color={live ? '#D9F8EF' : BRAND.muted} />
    </TouchableOpacity>
  );
}

function timeMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [hasStudentSurvey, setHasStudentSurvey] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const endpoint = user?.role ? endpointByRole[user.role] : undefined;
    try {
      if (endpoint) {
        const response = await apiClient.get<Dashboard>(endpoint);
        setDashboard(response.data);
        if (user?.role === 'STUDENT') {
          try {
            const surveyResponse = await apiClient.get<{ data?: unknown[] }>('/users/me/intake-surveys');
            setHasStudentSurvey(Boolean(surveyResponse.data.data?.length));
          } catch {
            setHasStudentSurvey(null);
          }
        } else setHasStudentSurvey(null);
      } else if (user?.role === 'COUNSELOR' || user?.role === 'HR') {
        const { data } = await apiClient.get<Record<string, number>>('/users/stats');
        const customMetrics = user.role === 'HR'
          ? [{ label: 'إجمالي الحسابات النشطة', value: data.total }, { label: 'المعلمون', value: data.teachers }, { label: 'موظفو الموارد البشرية', value: data.hr }]
          : [{ label: 'الطلاب', value: data.students }, { label: 'أولياء الأمور', value: data.parents }, { label: 'المرشدون', value: data.counselors }];
        setDashboard({ customMetrics });
      } else if (user?.role === 'SUPERVISOR') {
        const [classesResponse, teachersResponse] = await Promise.all([apiClient.get<any[]>('/admin/dashboard/classes'), apiClient.get<any[]>('/admin/dashboard/teachers')]);
        setDashboard({
          customMetrics: [{ label: 'الفصول', value: classesResponse.data.length }, { label: 'المعلمون', value: teachersResponse.data.length }],
          classPerformance: classesResponse.data.map((item) => ({ id: item.classId, name: item.className, studentCount: item.studentsCount, averageGrade: item.avgGrade })),
        });
      } else if (user?.role === 'ACCOUNTANT') {
        const [financialResponse, invoiceResponse] = await Promise.all([apiClient.get<Array<{ currency: string; total: number }>>('/admin/dashboard/stats/financial'), apiClient.get<any>('/payments/school-invoices?page=1&limit=100')]);
        const currencyTotals = new Map<string, number>();
        financialResponse.data.forEach((item) => currencyTotals.set(item.currency, (currencyTotals.get(item.currency) ?? 0) + item.total));
        setDashboard({ customMetrics: [{ label: 'إجمالي الفواتير', value: invoiceResponse.data?.meta?.total ?? invoiceResponse.data?.data?.length ?? 0 }, ...Array.from(currencyTotals.entries()).map(([currency, total]) => ({ label: `إيرادات محصلة · ${currency}`, value: total.toLocaleString('ar-SA') }))] });
      } else {
        setDashboard(null);
        setError('لا توجد لوحة متاحة لهذا الدور.');
        return;
      }
      setError('');
    } catch (loadError) {
      setError(readableError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  const title = dashboard?.student?.name ?? dashboard?.teacher?.name ?? dashboard?.admin?.name ?? user?.name ?? 'حساب نكسس';
  const metrics = dashboard?.summary ?? dashboard?.kpis ?? {};
  const metricItems = Object.entries(metrics).filter(([key]) => key in metricLabels).map(([key, value]) => ({ label: metricLabels[key], value: valueLabel(key, value) }));
  const allMetricItems = [...metricItems, ...(dashboard?.customMetrics ?? []).map((metric) => ({ label: metric.label, value: typeof metric.value === 'number' ? metric.value.toLocaleString('ar-SA') : metric.value }))];
  const classes = dashboard?.student?.classes ?? dashboard?.classPerformance ?? [];
  const assignments = dashboard?.upcomingAssignments ?? dashboard?.recentAssignments ?? [];
  const avatar = dashboard?.student?.avatar || dashboard?.teacher?.avatarUrl || dashboard?.teacher?.avatar_url || dashboard?.teacher?.avatar || user?.avatarUrl || user?.avatar_url || user?.avatar;
  const openTeacherTab = (tab: string) => router.push({ pathname: '/(tabs)/workspace', params: { tab } } as never);
  const homeActions = actionsForRole(user?.role);
  const greeting = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
  const dateLabel = new Date().toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' });

  const openHomeAction = (action: HomeAction) => {
    if (action.tab) openTeacherTab(action.tab);
    else if (action.href) router.push(action.href as never);
  };

  return (
    <AppPage contentStyle={styles.page} scroll={false}>
      <View style={styles.dashboardRoot}>
        <BrandHeader eyebrow="مدارس الإخلاص الأهلية · جدة" />
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={BRAND.teal} onRefresh={() => { setRefreshing(true); void load(); }} />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <Animated.View entering={FadeInDown.duration(380)} style={styles.hero}>
          <View pointerEvents="none" style={styles.heroOrb} />
          <View style={styles.heroTopLine}>
            <View style={styles.rolePill}><Text style={styles.rolePillText}>{roleLabels[user?.role ?? ''] ?? 'حساب نكسس'}</Text></View>
            <View style={styles.heroMark}><Image source={require('../../assets/images/nexus-emblem.png')} style={styles.heroMarkImage} resizeMode="contain" /></View>
          </View>
          <View style={styles.heroIdentity}>
            {avatar
              ? <Image source={{ uri: avatar }} style={styles.heroAvatar} />
              : <View style={styles.heroAvatarFallback}><Ionicons name="person-outline" size={25} color={BRAND.teal} /></View>}
            <View style={styles.heroCopy}>
              <Text style={styles.greeting}>{greeting}،</Text>
              <Text numberOfLines={2} style={styles.name}>{title}</Text>
              <Text style={styles.heroHint}>رحلتك التعليمية تبدأ بخطوة اليوم</Text>
            </View>
          </View>
          <View style={styles.heroFooter}>
            <View style={styles.dateChip}><Ionicons name="calendar-outline" size={14} color="#D3F6EB" /><Text style={styles.dateChipText}>{dateLabel}</Text></View>
            <View style={styles.brandChip}><View style={styles.brandChipDot} /><Text style={styles.brandChipText}>NEXUS EDU</Text></View>
          </View>
        </Animated.View>

        {user?.role === 'STUDENT' || user?.role === 'TEACHER' ? <TodayLessonCard onPress={() => router.push('/(tabs)/workspace')} /> : null}

        <View style={styles.quickSection}>
          <SectionHeading title="وصول سريع" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAccessRow}>
            {homeActions.map((action) => <TouchableOpacity key={action.label} accessibilityRole="button" onPress={() => openHomeAction(action)} activeOpacity={0.82} style={styles.quickAction}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.background }]}><Ionicons name={action.icon} size={23} color={action.color} /></View>
              <Text numberOfLines={2} style={styles.quickActionLabel}>{action.label}</Text>
              <Ionicons name="arrow-back" size={14} color={BRAND.muted} />
            </TouchableOpacity>)}
          </ScrollView>
        </View>

        {loading ? <ActivityIndicator color={BRAND.teal} size="large" style={{ marginVertical: 28 }} /> : null}
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}

        {user?.role === 'STUDENT' && hasStudentSurvey === false ? <Surface style={styles.surveyCard}>
          <View style={styles.surveyIcon}><Ionicons name="heart-outline" size={19} color={BRAND.amber} /></View>
          <Text style={styles.surveyTitle}>أكمل استبيان بياناتك</Text>
          <Text style={styles.surveyDescription}>يمكنك أو ولي أمرك تعبئة الإجابات؛ ستُحفظ في ملفك الدراسي لتساعد المدرسة على دعمك.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/intake-survey')} style={styles.surveyAction}>
            <Text style={styles.surveyActionText}>ابدأ الاستبيان</Text><Ionicons name="arrow-back" size={16} color={BRAND.ink} />
          </TouchableOpacity>
        </Surface> : null}
        {user?.role === 'STUDENT' && hasStudentSurvey === true ? <Surface style={styles.surveyDone}>
          <Ionicons name="checkmark-circle-outline" size={19} color={BRAND.teal} /><Text style={styles.surveyDoneText}>إجابات الاستبيان محفوظة في ملفك</Text>
        </Surface> : null}

        {!loading && !error && allMetricItems.length ? (
          <View style={styles.section}>
          <SectionHeading title="ملخصك الدراسي" />
          <View style={styles.metrics}>
            {allMetricItems.slice(0, 4).map((metric, index) => (
              <Surface key={`${metric.label}-${index}`} style={styles.metric}>
                <View style={[styles.metricIcon, { backgroundColor: [BRAND.tealSoft, BRAND.blueSoft, BRAND.amberSoft, '#F1ECFF'][index] }]}>
                  <Ionicons name={['stats-chart-outline', 'book-outline', 'checkmark-done-outline', 'calendar-outline'][index] as any} size={19} color={[BRAND.teal, BRAND.blue, BRAND.amber, '#7156B8'][index]} />
                </View>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </Surface>
            ))}
          </View>
          </View>
        ) : null}

        {dashboard?.children ? <View style={styles.section}>
          <SectionHeading title="الأبناء المرتبطون" />
          {dashboard.children.length ? dashboard.children.map((child) => <Surface key={child.id} style={styles.record}>
            {child.avatar ? <Image source={{ uri: child.avatar }} style={styles.childAvatar} /> : <View style={styles.childAvatarFallback}><Ionicons name="person-outline" size={18} color={BRAND.blue} /></View>}
            <View style={styles.recordCopy}><Text style={styles.recordTitle}>{child.name}</Text><Text style={styles.recordMeta}>{child.className ?? 'لا يوجد فصل مسجل'}</Text></View>
            <View style={styles.recordNumbers}><Text style={styles.recordValue}>{child.averageGrade === null ? '—' : valueLabel('averageGrade', child.averageGrade)}</Text><Text style={styles.recordMeta}>المعدل</Text></View>
          </Surface>) : <EmptyState title="لا يوجد أبناء مرتبطون بهذا الحساب" detail="يحتاج ولي الأمر إلى رمز يصدره الطالب لإتمام الربط." />}
        </View> : null}

        {classes.length ? <View style={styles.section}>
          <SectionHeading title={user?.role === 'STUDENT' ? 'فصولي' : 'الفصول المسندة'} />
          {classes.map((item: any) => <Surface key={item.id} style={styles.record}>
            <View style={styles.recordIcon}><Ionicons name="people-outline" size={18} color={BRAND.teal} /></View>
            <View style={styles.recordCopy}><Text style={styles.recordTitle}>{item.name}</Text><Text style={styles.recordMeta}>{item.teacher ? `المعلم: ${item.teacher}` : item.studentCount !== undefined ? `${item.studentCount} طالب${item.subjectCount === undefined ? '' : ` · ${item.subjectCount} مادة`}` : 'بيانات الفصل من سجلات المدرسة'}</Text></View>
          </Surface>)}
        </View> : null}

        {assignments.length ? <View style={styles.section}>
          <SectionHeading title={dashboard?.upcomingAssignments ? 'الواجبات القادمة' : 'آخر الواجبات'} />
          {assignments.map((assignment) => <Surface key={assignment.id} style={styles.assignment}>
            <View style={styles.recordIcon}><Ionicons name="document-text-outline" size={18} color={BRAND.amber} /></View>
            <View style={styles.recordCopy}><Text style={styles.recordTitle}>{assignment.title}</Text><Text style={styles.recordMeta}>{typeof assignment.subject === 'string' ? assignment.subject : assignment.subject?.name ?? ''}{assignment.dueDate ? ` · ${new Date(assignment.dueDate).toLocaleDateString('ar-SA')}` : ''}</Text></View>
          </Surface>)}
        </View> : null}

        {dashboard?.gradingQueue ? <View style={styles.section}>
          <SectionHeading title="تسليمات بانتظار التصحيح" />
          {dashboard.gradingQueue.length ? dashboard.gradingQueue.slice(0, 4).map((submission) => <Surface key={submission.id} style={styles.record}>
            <View style={[styles.recordIcon, { backgroundColor: BRAND.amberSoft }]}><Ionicons name="create-outline" size={18} color={BRAND.amber} /></View>
            <View style={styles.recordCopy}><Text style={styles.recordTitle}>{submission.assignment?.title ?? 'تسليم طالب'}</Text><Text style={styles.recordMeta}>{submission.student?.name ?? submission.student?.email ?? 'طالب'}</Text></View>
          </Surface>) : <EmptyState title="قائمة التصحيح فارغة" detail="ستظهر هنا التسليمات الحقيقية بعد إرسال الطلاب للواجبات." />}
        </View> : null}

        {user?.role === 'TEACHER' && dashboard?.interventionAlerts?.length ? <View style={styles.section}>
          <SectionHeading title="تنبيهات التدخل المبكر" />
          {dashboard.interventionAlerts.map((alert) => <Surface key={alert.id} style={styles.alertCard}>
            <View style={styles.alertIcon}><Ionicons name="alert-circle-outline" size={19} color={BRAND.amber} /></View>
            <View style={styles.recordCopy}><Text style={styles.recordTitle}>{alert.title}</Text><Text style={styles.recordMeta}>{alert.body}</Text></View>
          </Surface>)}
        </View> : null}

        {!loading && !error && dashboard && !allMetricItems.length && !classes.length && !assignments.length && !dashboard.children?.length && !dashboard.gradingQueue?.length ? <EmptyState title="لا توجد سجلات لعرضها الآن" detail="ستظهر بياناتك هنا عند ربطك بفصل أو نشاط مدرسي." /> : null}
        </ScrollView>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  dashboardRoot: { flex: 1, paddingHorizontal: 18, paddingTop: 6 },
  scrollContent: { gap: 17, paddingBottom: 30, paddingTop: 12 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 190, justifyContent: 'space-between', padding: 17, borderRadius: 24, backgroundColor: BRAND.ink, gap: 13, elevation: 4, shadowColor: BRAND.ink, shadowOpacity: 0.15, shadowRadius: 13, shadowOffset: { width: 0, height: 6 } },
  heroOrb: { position: 'absolute', top: -80, right: -44, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(0, 138, 120, 0.28)' },
  heroTopLine: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  rolePill: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)' },
  rolePillText: { color: '#E3F7F1', fontSize: 11, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  heroMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#FFFFFF' },
  heroMarkImage: { width: 30, height: 30, borderRadius: 8 },
  heroIdentity: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  heroCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  greeting: { color: '#BFE8DF', fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  heroAvatar: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  heroAvatarFallback: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#D8F3EC' },
  name: { color: '#FFFFFF', fontSize: 21, lineHeight: 28, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  heroHint: { color: '#D3DDE7', fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  heroFooter: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  dateChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  dateChipText: { color: '#D3F6EB', fontSize: 11, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  brandChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  brandChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#63D4B3' },
  brandChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  lessonCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, minHeight: 94, padding: 13, borderRadius: 20, borderWidth: 1, borderColor: '#CBE9E2', backgroundColor: '#F0FAF7' },
  lessonCardLive: { borderColor: BRAND.teal, backgroundColor: BRAND.teal },
  lessonIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#FFFFFF' },
  lessonIconLive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  lessonCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  lessonHeading: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  lessonEyebrow: { color: BRAND.teal, flex: 1, fontSize: 11, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  lessonEyebrowLive: { color: '#D6F5EC' },
  lessonTitle: { color: BRAND.ink, width: '100%', fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  lessonTitleLive: { color: '#FFFFFF' },
  lessonMeta: { color: BRAND.muted, width: '100%', fontSize: 10, textAlign: 'right', writingDirection: 'rtl' },
  lessonMetaLive: { color: '#E0F8F1' },
  liveBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)' },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8EF0CE' },
  liveBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', writingDirection: 'rtl' },
  quickSection: { gap: 9 },
  quickAccessRow: { flexDirection: 'row-reverse', gap: 9, paddingVertical: 2 },
  quickAction: { width: 84, minHeight: 102, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 11, borderWidth: 1, borderColor: BRAND.line, borderRadius: 18, backgroundColor: BRAND.paper },
  quickActionIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  quickActionLabel: { color: BRAND.ink, minHeight: 29, fontSize: 10, lineHeight: 14, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
  metrics: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  surveyCard: { gap: 8, borderColor: '#F1D3A0', backgroundColor: '#FFFCF4' },
  surveyIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: BRAND.amberSoft },
  surveyTitle: { color: BRAND.ink, fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  surveyDescription: { color: BRAND.muted, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  surveyAction: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, minHeight: 39, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F7E6BC' },
  surveyActionText: { color: BRAND.ink, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  surveyDone: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  surveyDoneText: { color: BRAND.teal, fontSize: 13, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  metric: { width: '48.5%', minHeight: 112, justifyContent: 'space-between', padding: 13, borderRadius: 18 },
  metricIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  metricValue: { color: BRAND.ink, fontSize: 23, fontWeight: '900', textAlign: 'right' },
  metricLabel: { color: BRAND.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  section: { gap: 10 },
  record: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, padding: 13 },
  assignment: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, padding: 12 },
  recordIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: BRAND.tealSoft },
  childAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF' },
  childAvatarFallback: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: BRAND.blueSoft },
  recordCopy: { flex: 1, gap: 4, alignItems: 'flex-end' },
  recordTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  recordMeta: { color: BRAND.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  recordNumbers: { alignItems: 'center', gap: 3, paddingInline: 7 },
  recordValue: { color: BRAND.teal, fontSize: 16, fontWeight: '900' },
  alertCard: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  alertIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.amberSoft },
});
