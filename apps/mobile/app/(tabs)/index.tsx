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
  teacher?: { name?: string };
  admin?: { name?: string };
  summary?: Record<string, number | null>;
  kpis?: Record<string, number | null>;
  upcomingAssignments?: Array<{ id: string; title: string; subject?: string | { name: string }; dueDate?: string | null }>;
  recentAssignments?: Array<{ id: string; title: string; subject?: string | { name: string }; dueDate?: string | null }>;
  classPerformance?: Array<{ id: string; name: string; studentCount: number; subjectCount: number; averageGrade: number | null }>;
  gradingQueue?: Array<{ id: string; student?: { name?: string; email?: string }; assignment?: { title?: string } }>;
  children?: Array<{ id: string; name: string; avatar?: string | null; className: string | null; averageGrade: number | null; attendanceRate: number | null }>;
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

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const endpoint = user?.role ? endpointByRole[user.role] : undefined;
    if (!endpoint) {
      setDashboard(null);
      setError('لوحة هذا الدور غير منشورة في الـAPI حاليًا. لم نعرض بيانات بديلة.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const response = await apiClient.get<Dashboard>(endpoint);
      setDashboard(response.data);
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
  const metricItems = Object.entries(metrics).filter(([key]) => key in metricLabels);
  const classes = dashboard?.student?.classes ?? dashboard?.classPerformance ?? [];
  const assignments = dashboard?.upcomingAssignments ?? dashboard?.recentAssignments ?? [];

  return (
    <AppPage contentStyle={styles.page} scroll={false}>
      <View style={styles.dashboardRoot}>
        <BrandHeader />
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={BRAND.teal} onRefresh={() => { setRefreshing(true); void load(); }} />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <Animated.View entering={FadeInDown.duration(380)} style={styles.hero}>
          <Text style={styles.eyebrow}>{roleLabels[user?.role ?? ''] ?? 'حساب نكسس'}</Text>
          <View style={styles.heroIdentity}>
            {dashboard?.student?.avatar || user?.avatarUrl || user?.avatar
              ? <Image source={{ uri: dashboard?.student?.avatar || user?.avatarUrl || user?.avatar || '' }} style={styles.heroAvatar} />
              : <View style={styles.heroAvatarFallback}><Ionicons name="person-outline" size={24} color={BRAND.teal} /></View>}
            <View style={styles.heroCopy}><Text style={styles.name}>{title}</Text><Text style={styles.email}>{user?.email}</Text></View>
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/workspace')} style={styles.heroAction}>
            <Text style={styles.heroActionText}>{user?.role === 'TEACHER' ? 'افتح أدوات المعلم' : user?.role === 'STUDENT' ? 'الواجبات والمواد' : 'تفاصيل الحساب'}</Text>
            <Ionicons name="arrow-back" size={18} color={BRAND.ink} />
          </TouchableOpacity>
        </Animated.View>

        {loading ? <ActivityIndicator color={BRAND.teal} size="large" style={{ marginVertical: 28 }} /> : null}
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}

        {!loading && !error && metricItems.length ? (
          <View style={styles.metrics}>
            {metricItems.slice(0, 4).map(([key, value], index) => (
              <Surface key={key} style={styles.metric}>
                <View style={[styles.metricIcon, { backgroundColor: [BRAND.tealSoft, BRAND.blueSoft, BRAND.amberSoft, '#F1ECFF'][index] }]}>
                  <Ionicons name={['stats-chart-outline', 'book-outline', 'checkmark-done-outline', 'calendar-outline'][index] as any} size={19} color={[BRAND.teal, BRAND.blue, BRAND.amber, '#7156B8'][index]} />
                </View>
                <Text style={styles.metricValue}>{valueLabel(key, value)}</Text>
                <Text style={styles.metricLabel}>{metricLabels[key]}</Text>
              </Surface>
            ))}
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
            <View style={styles.recordCopy}><Text style={styles.recordTitle}>{item.name}</Text><Text style={styles.recordMeta}>{item.teacher ? `المعلم: ${item.teacher}` : item.studentCount !== undefined ? `${item.studentCount} طالب · ${item.subjectCount ?? 0} مادة` : 'بيانات الفصل من سجلات المدرسة'}</Text></View>
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

        {!loading && !error && dashboard && !metricItems.length && !classes.length && !assignments.length && !dashboard.children?.length && !dashboard.gradingQueue?.length ? <EmptyState title="لا توجد سجلات لعرضها الآن" detail="ستظهر بياناتك هنا عند ربطك بفصل أو نشاط مدرسي." /> : null}
        </ScrollView>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  dashboardRoot: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  scrollContent: { gap: 18, paddingBottom: 30, paddingTop: 15 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 180, justifyContent: 'center', padding: 21, borderRadius: 20, backgroundColor: BRAND.ink, gap: 8 },
  eyebrow: { color: '#BEE9E1', fontSize: 12, textAlign: 'right', fontWeight: '700', writingDirection: 'rtl' },
  heroIdentity: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13 },
  heroCopy: { flex: 1, alignItems: 'flex-end', gap: 5 },
  heroAvatar: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  heroAvatarFallback: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#D8F3EC' },
  name: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  email: { color: '#CBD7E2', fontSize: 12, textAlign: 'right' },
  heroAction: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: 12, paddingHorizontal: 14, minHeight: 42, borderRadius: 12, backgroundColor: '#D8F3EC' },
  heroActionText: { color: BRAND.ink, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  metrics: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  metric: { width: '48.5%', minHeight: 116, justifyContent: 'space-between', padding: 13 },
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
});
