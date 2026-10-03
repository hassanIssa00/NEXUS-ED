import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

type Dashboard = {
  student?: { name?: string; classes?: Array<{ id: string; name: string; teacher?: string | null }> };
  teacher?: { name?: string };
  admin?: { name?: string };
  summary?: Record<string, number | null>;
  kpis?: Record<string, number | null>;
  upcomingAssignments?: DashboardAssignment[];
  recentAssignments?: DashboardAssignment[];
  classPerformance?: Array<{ id: string; name: string; studentCount: number; subjectCount: number; averageGrade: number | null }>;
  gradingQueue?: Array<{ id: string; student?: { name?: string; email?: string }; assignment?: { title?: string } }>;
  children?: Array<{ id: string; name: string; className: string | null; averageGrade: number | null; attendanceRate: number | null }>;
  systemHealth?: Array<{ name: string; status: string; value: number; detail: string }>;
};

type DashboardAssignment = {
  id: string;
  title: string;
  subject?: string | { name: string };
  dueDate?: string | null;
  submissions?: number;
};

const endpointByRole: Record<string, string> = {
  STUDENT: '/dashboard/student',
  PARENT: '/dashboard/parent',
  TEACHER: '/dashboard/teacher',
  ADMIN: '/dashboard/admin',
  PRINCIPAL: '/dashboard/admin',
  VICE_PRINCIPAL: '/dashboard/admin',
};

const metricLabels: Record<string, string> = {
  totalSubjects: 'Subjects',
  pendingAssignments: 'To do',
  completedAssignments: 'Completed',
  attendanceRate: 'Attendance',
  averageGrade: 'Average grade',
  totalClasses: 'Classes',
  totalStudents: 'Students',
  totalAssignments: 'Assignments',
  totalLessons: 'Lessons',
  pendingSubmissions: 'To review',
  totalUsers: 'Accounts',
  totalTeachers: 'Teachers',
  totalRevenue: 'Revenue',
  activeUsers: 'Active accounts',
};

function displayValue(key: string, value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('grade')) return `${Math.round(value)}%`;
  return value.toLocaleString();
}

function readError(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر تحميل بيانات الحساب. اسحب للتحديث أو حاول لاحقًا.';
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const endpoint = user?.role ? endpointByRole[user.role] : undefined;
    if (!endpoint) {
      setDashboard(null);
      setError('لوحة هذا الدور غير متاحة في تطبيق الموبايل حاليًا.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await apiClient.get<Dashboard>(endpoint);
      setDashboard(response.data);
      setError(null);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => {
    setLoading(true);
    void loadDashboard();
  }, [loadDashboard]);

  const roleName = user?.role === 'PARENT' ? 'Parent' : user?.role === 'TEACHER' ? 'Teacher' : user?.role === 'STUDENT' ? 'Student' : 'School';
  const title = dashboard?.student?.name ?? dashboard?.teacher?.name ?? dashboard?.admin?.name ?? user?.name ?? user?.email ?? 'Nexus EDU';
  const metrics = dashboard?.summary ?? dashboard?.kpis ?? {};
  const metricEntries = Object.entries(metrics).filter(([key]) => key in metricLabels);
  const classes = dashboard?.student?.classes ?? dashboard?.classPerformance ?? [];
  const assignments = dashboard?.upcomingAssignments ?? dashboard?.recentAssignments ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        keyExtractor={() => 'dashboard'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadDashboard(); }} />}
        ListHeaderComponent={(
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>{roleName} portal</Text>
                <Text style={styles.title}>{title}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => void signOut()} style={styles.iconButton}>
                <Text style={styles.signOut}>خروج</Text>
              </TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator color="#365CF5" style={styles.loader} /> : null}
            {error ? <Text accessibilityRole="alert" style={styles.notice}>{error}</Text> : null}

            {metricEntries.length > 0 ? (
              <View style={styles.metrics}>
                {metricEntries.map(([key, value]) => (
                  <View key={key} style={styles.metric}>
                    <Text style={styles.metricValue}>{displayValue(key, value)}</Text>
                    <Text style={styles.metricLabel}>{metricLabels[key]}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {dashboard?.children ? (
              <Section title="الأبناء">
                {dashboard.children.length ? dashboard.children.map((child) => (
                  <View key={child.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{child.name}</Text>
                    <Text style={styles.rowMeta}>{child.className ?? 'لا يوجد فصل مسجل'}</Text>
                    <Text style={styles.rowMeta}>
                      {child.averageGrade === null ? 'لا توجد درجات مسجلة' : `المعدل ${displayValue('averageGrade', child.averageGrade)}`}
                      {' · '}
                      {child.attendanceRate === null ? 'لا يوجد سجل حضور' : `الحضور ${displayValue('attendanceRate', child.attendanceRate)}`}
                    </Text>
                  </View>
                )) : <Text style={styles.empty}>لا يوجد أبناء مرتبطون بهذا الحساب.</Text>}
              </Section>
            ) : null}

            {classes.length > 0 ? (
              <Section title={user?.role === 'STUDENT' ? 'فصولي' : 'الفصول المكلف بها'}>
                {classes.map((item: any) => (
                  <View key={item.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                      {item.teacher ? `المعلم: ${item.teacher}` : null}
                      {item.studentCount !== undefined ? `الطلاب: ${item.studentCount}` : null}
                      {item.subjectCount !== undefined ? ` · المواد: ${item.subjectCount}` : null}
                      {item.averageGrade === null ? ' · لا توجد درجات مسجلة' : item.averageGrade !== undefined ? ` · المعدل ${displayValue('averageGrade', item.averageGrade)}` : null}
                    </Text>
                  </View>
                ))}
              </Section>
            ) : null}

            {assignments.length > 0 ? (
              <Section title={dashboard?.upcomingAssignments ? 'الواجبات القادمة' : 'آخر الواجبات'}>
                {assignments.map((assignment) => (
                  <View key={assignment.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{assignment.title}</Text>
                    <Text style={styles.rowMeta}>
                      {typeof assignment.subject === 'string' ? assignment.subject : assignment.subject?.name}
                      {assignment.dueDate ? ` · ${new Date(assignment.dueDate).toLocaleDateString()}` : ''}
                    </Text>
                  </View>
                ))}
              </Section>
            ) : null}

            {dashboard?.gradingQueue ? (
              <Section title="إجابات بانتظار التصحيح">
                {dashboard.gradingQueue.length ? dashboard.gradingQueue.map((submission) => (
                  <View key={submission.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{submission.assignment?.title ?? 'إجابة طالب'}</Text>
                    <Text style={styles.rowMeta}>{submission.student?.name ?? submission.student?.email ?? 'طالب'}</Text>
                  </View>
                )) : <Text style={styles.empty}>لا توجد إجابات تنتظر المراجعة.</Text>}
              </Section>
            ) : null}

            {dashboard?.systemHealth ? (
              <Section title="مؤشرات النظام">
                {dashboard.systemHealth.map((item) => (
                  <View key={item.name} style={styles.row}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowMeta}>{item.detail}</Text>
                  </View>
                ))}
              </Section>
            ) : null}

            {!loading && !error && dashboard && !metricEntries.length && !classes.length && !assignments.length && !dashboard.children?.length && !dashboard.gradingQueue?.length ? (
              <Text style={styles.empty}>لا توجد سجلات لعرضها حتى الآن.</Text>
            ) : null}
          </>
        )}
        renderItem={null}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 36, marginBottom: 24 },
  eyebrow: { color: '#52627A', fontSize: 13, marginBottom: 5 },
  title: { color: '#101828', fontSize: 24, fontWeight: '700' },
  iconButton: { minWidth: 56, minHeight: 42, justifyContent: 'center', alignItems: 'center' },
  signOut: { color: '#B42318', fontSize: 14, fontWeight: '600' },
  loader: { marginVertical: 28 },
  notice: { color: '#8A2C0D', backgroundColor: '#FFF4E5', borderRadius: 6, padding: 12, marginBottom: 16, textAlign: 'right' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  metric: { minWidth: '30%', flexGrow: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E9F0', borderRadius: 6, padding: 14 },
  metricValue: { color: '#182230', fontSize: 21, fontWeight: '700' },
  metricLabel: { color: '#52627A', fontSize: 12, marginTop: 5 },
  section: { marginBottom: 22 },
  sectionTitle: { color: '#182230', fontSize: 17, fontWeight: '700', marginBottom: 10, textAlign: 'right' },
  row: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E4E9F0', paddingVertical: 14, paddingHorizontal: 12 },
  rowTitle: { color: '#182230', fontSize: 15, fontWeight: '600', textAlign: 'right' },
  rowMeta: { color: '#52627A', fontSize: 12, marginTop: 5, textAlign: 'right' },
  empty: { color: '#52627A', fontSize: 14, padding: 16, textAlign: 'center' },
});
