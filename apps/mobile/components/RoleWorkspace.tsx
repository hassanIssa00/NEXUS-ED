import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppPage, BrandHeader, EmptyState, ErrorNotice, PrimaryButton, SectionHeading, Surface } from './mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { PortalFeatureCatalog } from '@/components/PortalFeatureCatalog';

type Item = { title: string; detail: string };
type Panel = { title: string; lines?: Array<{ label: string; value: string }>; items?: Item[] };
const roleNames: Record<string, string> = { COUNSELOR: 'التوجيه الطلابي', SUPERVISOR: 'الإشراف التربوي', ACCOUNTANT: 'المحاسبة المالية', HR: 'الموارد البشرية' };
const count = (value: unknown) => typeof value === 'number' ? value.toLocaleString('ar-SA') : value == null ? '—' : String(value);
const rows = (value: any) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
const text = (error: any) => { const message = error?.response?.data?.message; return Array.isArray(message) ? message.join('، ') : message || 'تعذر تحميل البيانات من الخادم.'; };

export function RoleWorkspace() {
  const { user } = useAuth();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user?.role) return;
    setLoading(true); setError('');
    const failures: string[] = [];
    const get = async (endpoint: string, title: string) => {
      try { return (await apiClient.get(endpoint)).data; }
      catch (requestError) { failures.push(`${title}: ${text(requestError)}`); return null; }
    };
    const next: Panel[] = [];
    try {
      if (user.role === 'COUNSELOR') {
        const [classesResult, surveysResult, statsResult] = await Promise.all([
          get('/classes', 'الفصول'), get('/users/parent-surveys?page=1&limit=20', 'استبيانات أولياء الأمور'), get('/users/stats', 'المؤشرات'),
        ]);
        const classList = rows(classesResult);
        const warningResults = await Promise.all(classList.map(async (item: any) => ({ item, data: await get(`/analytics/student/early-warnings?classId=${encodeURIComponent(item.id)}`, `تنبيهات ${item.name}`) })));
        const warnings = warningResults.flatMap(({ item, data }) => rows(data).map((warning: any) => ({ ...warning, className: item.name })));
        if (statsResult && typeof statsResult === 'object') next.push({ title: 'مؤشرات المدرسة', lines: Object.entries(statsResult).filter(([, value]) => typeof value === 'number').map(([label, value]) => ({ label, value: count(value) })) });
        if (classesResult) next.push({ title: 'تنبيهات المتابعة', lines: [{ label: 'عدد الفصول', value: count(classList.length) }, { label: 'الطلاب ذوو التنبيهات', value: count(warnings.length) }], items: warnings.slice(0, 40).map((warning: any) => ({ title: `${warning.studentName} · ${warning.className}`, detail: `مستوى المتابعة ${warning.riskLevel} · ${(warning.alerts ?? []).map((alert: any) => alert.message).join('، ')}` })) });
        if (surveysResult) next.push({ title: 'استبيانات أولياء الأمور', lines: [{ label: 'السجلات المعروضة', value: count(rows(surveysResult).length) }], items: rows(surveysResult).slice(0, 20).map((item: any) => ({ title: item.student?.name ?? item.studentName ?? 'استبيان ولي أمر', detail: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('ar-SA') : 'إجابة محفوظة في النظام' })) });
      } else if (user.role === 'SUPERVISOR') {
        const [teachersResult, classesResult] = await Promise.all([get('/admin/dashboard/teachers', 'المعلمون'), get('/admin/dashboard/classes', 'الفصول')]);
        if (teachersResult) next.push({ title: 'المعلمون', lines: [{ label: 'عدد المعلمين', value: count(rows(teachersResult).length) }], items: rows(teachersResult).slice(0, 50).map((teacher: any) => ({ title: teacher.teacherName, detail: `الفصول ${count(teacher.stats?.classesCount)} · المواد ${count(teacher.stats?.subjectsCount)} · متوسط الدرجات ${teacher.stats?.avgStudentScore == null ? '—' : `${teacher.stats.avgStudentScore}٪`}` })) });
        if (classesResult) next.push({ title: 'نشاط الفصول', lines: [{ label: 'عدد الفصول', value: count(rows(classesResult).length) }], items: rows(classesResult).slice(0, 50).map((item: any) => ({ title: item.className, detail: `طلاب ${count(item.studentsCount)} · حضور ${item.avgAttendance == null ? '—' : `${item.avgAttendance}٪`} · ${item.status}` })) });
      } else if (user.role === 'ACCOUNTANT') {
        const [financialResult, invoicesResult] = await Promise.all([get('/admin/dashboard/stats/financial', 'الإيرادات'), get('/payments/school-invoices?page=1&limit=50', 'الفواتير')]);
        if (financialResult) next.push({ title: 'الإيرادات المحصلة خلال آخر 12 شهرًا', items: rows(financialResult).map((item: any) => ({ title: `${item.name} · ${item.currency}`, detail: `${count(item.total)} ${item.currency}` })) });
        if (invoicesResult) next.push({ title: 'الفواتير المدرسية', lines: [{ label: 'عدد الفواتير في الصفحة', value: count(rows(invoicesResult?.invoices).length) }, ...(invoicesResult?.meta?.total === undefined ? [] : [{ label: 'إجمالي الفواتير', value: count(invoicesResult.meta.total) }])], items: rows(invoicesResult?.invoices).slice(0, 50).map((item: any) => ({ title: item.student?.name ?? item.studentName ?? item.description ?? 'فاتورة', detail: `${count(item.amount)} ${item.currency ?? 'SAR'} · ${item.status ?? '—'}` })) });
      } else if (user.role === 'HR') {
        const [statsResult, staffResult] = await Promise.all([get('/users/stats', 'المؤشرات'), get('/users/staff?page=1&limit=100', 'الموظفون')]);
        if (statsResult && typeof statsResult === 'object') next.push({ title: 'مؤشرات الموارد البشرية', lines: Object.entries(statsResult).filter(([, value]) => typeof value === 'number').map(([label, value]) => ({ label, value: count(value) })) });
        if (staffResult) next.push({ title: 'سجل الموظفين', lines: [{ label: 'المعروض', value: count(rows(staffResult).length) }, ...(staffResult?.meta?.total === undefined ? [] : [{ label: 'إجمالي الموظفين', value: count(staffResult.meta.total) }])], items: rows(staffResult).slice(0, 70).map((item: any) => ({ title: item.name ?? [item.firstName, item.lastName].filter(Boolean).join(' ') ?? item.email, detail: `${item.role} · ${item.isActive ? 'نشط' : 'غير نشط'} · آخر ظهور ${item.lastActiveDate ? new Date(item.lastActiveDate).toLocaleString('ar-SA') : 'غير مسجل'}` })) });
      }
      setPanels(next);
      if (failures.length) setError(failures.join('\n'));
      if (!next.length && !failures.length) setError('لا توجد بيانات مرتبطة بالحساب حتى الآن.');
    } finally { setLoading(false); }
  }, [user?.role]);
  useEffect(() => { void load(); }, [load]);

  return <AppPage>
    <BrandHeader />
    <View style={styles.heading}><Text style={styles.eyebrow}>{roleNames[user?.role ?? ''] ?? 'بوابة المدرسة'}</Text><Text style={styles.title}>مساحة العمل</Text><Text style={styles.subtitle}>بيانات الفصول والموظفين والسجلات حسب صلاحية حسابك.</Text></View>
    <PortalFeatureCatalog role={user?.role} />
    {loading ? <ActivityIndicator color={BRAND.teal} size="large" /> : null}
    {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {!loading && !panels.length && !error ? <EmptyState title="لا توجد سجلات" detail="لم يرجع الخادم بيانات لهذا الحساب." /> : null}
    {panels.map((panel) => <Surface key={panel.title}>
      <SectionHeading title={panel.title} />
      {panel.lines?.map((line) => <View key={line.label} style={styles.line}><Text style={styles.value}>{line.value}</Text><Text style={styles.label}>{line.label}</Text></View>)}
      {panel.items?.length ? panel.items.map((item, index) => <View key={`${item.title}-${index}`} style={styles.item}><Ionicons name="chevron-back" size={17} color={BRAND.teal} /><View style={styles.itemCopy}><Text style={styles.itemTitle}>{item.title || 'سجل'}</Text><Text style={styles.itemDetail}>{item.detail}</Text></View></View>) : panel.items ? <Text style={styles.emptyText}>لا توجد سجلات لهذا القسم.</Text> : null}
    </Surface>)}
    <PrimaryButton title="تحديث البيانات" icon="refresh-outline" onPress={() => void load()} loading={loading} />
  </AppPage>;
}

const styles = StyleSheet.create({
  heading: { gap: 5, alignItems: 'flex-end' },
  eyebrow: { color: BRAND.teal, fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  title: { color: BRAND.ink, fontSize: 23, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: BRAND.muted, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  line: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderColor: BRAND.line },
  label: { color: BRAND.muted, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  value: { color: BRAND.ink, fontSize: 14, fontWeight: '900' },
  item: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingVertical: 9, borderBottomWidth: 1, borderColor: BRAND.line },
  itemCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  itemTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  itemDetail: { color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  emptyText: { color: BRAND.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12, writingDirection: 'rtl' },
});
