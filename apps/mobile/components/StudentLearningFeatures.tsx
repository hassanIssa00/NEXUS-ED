import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/Config';
import { apiClient } from '@/lib/api';
import { ChoiceButton, EmptyState, PrimaryButton, SectionHeading, Surface } from '@/components/mobile-ui';

type Row = Record<string, any>;
const listOf = (value: any): Row[] => {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  for (const key of ['items', 'rows', 'records', 'lessons', 'classes', 'topics']) if (Array.isArray(data?.[key])) return data[key];
  return [];
};
const messageOf = (error: any) => Array.isArray(error?.response?.data?.message) ? error.response.data.message.join('، ') : error?.response?.data?.message ?? 'تعذر تحميل البيانات من النظام.';

export function StudentCoursesWorkspace({ rows, fail }: { rows: Row[]; fail: (message: string) => void }) {
  const openMeeting = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') throw new Error();
      void Linking.openURL(parsed.toString()).catch(() => fail('تعذر فتح رابط الجلسة.'));
    } catch { fail('رابط الجلسة غير صالح.'); }
  };
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return <View style={styles.stack}>{rows.length ? rows.map((item, index) => <Surface key={item.id ?? index} style={styles.card}>
    <SectionHeading title={item.name ?? item.className ?? 'الفصل الدراسي'} />
    {item.teacher ? <Text style={styles.copy}>المعلم: {item.teacher}</Text> : null}
    <Text style={styles.sectionLabel}>الجدول والجلسات</Text>
    {Array.isArray(item.schedule) && item.schedule.length ? item.schedule.map((slot: Row, slotIndex: number) => <View key={`${slot.dayOfWeek}-${slot.startTime}-${slotIndex}`} style={styles.row}>
      <Ionicons name="time-outline" size={17} color={BRAND.teal} />
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{slot.subject ?? 'حصة'}</Text><Text style={styles.copy}>{dayNames[slot.dayOfWeek] ?? 'اليوم غير محدد'} · {slot.startTime ?? '—'}–{slot.endTime ?? '—'}{slot.room ? ` · ${slot.room}` : ''}</Text></View>
    </View>) : <Text style={styles.copy}>لا يوجد جدول مسجل لهذا الفصل.</Text>}
    {item.nextClass ? <Text style={styles.copy}>الحصة القادمة: {item.nextSessionTitle ?? 'جلسة'} · {new Date(item.nextClass).toLocaleString('ar-SA')}</Text> : <Text style={styles.copy}>لا توجد جلسات قادمة مسجلة.</Text>}
    {item.meetingUrl ? <PrimaryButton title="فتح رابط الجلسة" icon="videocam-outline" onPress={() => openMeeting(item.meetingUrl)} /> : null}
  </Surface>) : <EmptyState title="لا توجد فصول مرتبطة" detail="ستظهر فصولك وجداولها هنا بعد ربطها بحساب الطالب." icon="albums-outline" />}</View>;
}

export function StudentLessonsWorkspace({ rows, fail }: { rows: Row[]; fail: (message: string) => void }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const [summary, setSummary] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const makeSummary = async (lesson: Row) => {
    setSelected(lesson); setSummary(null);
    if (!lesson.content?.trim()) return fail('لا يوجد نص محفوظ لهذا الدرس لإنشاء ملخص منه.');
    setLoading(true);
    try {
      const response = await apiClient.post(`/ai/lesson-summary/${encodeURIComponent(lesson.id)}`);
      setSummary(response.data?.data ?? response.data ?? null);
    } catch (error) { fail(messageOf(error)); }
    finally { setLoading(false); }
  };
  return <View style={styles.stack}>
    {rows.length ? rows.map((item, index) => <Surface key={item.id ?? index} style={styles.card}>
      <Text style={styles.rowTitle}>{item.title ?? 'درس'}</Text>
      <Text style={styles.copy}>{item.subject?.name ?? item.subjectName ?? 'مادة دراسية'}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString('ar-SA')}` : ''}</Text>
      {item.content ? <Text style={styles.copy} numberOfLines={5}>{item.content}</Text> : null}
      {item.videoUrl ? <PrimaryButton title="فتح فيديو الدرس" icon="play-circle-outline" tone="blue" onPress={() => { try { const url = new URL(item.videoUrl); if (url.protocol !== 'https:') throw new Error(); void Linking.openURL(url.toString()).catch(() => fail('تعذر فتح رابط الفيديو.')); } catch { fail('رابط الفيديو غير صالح.'); } }} /> : null}
      {Array.isArray(item.attachments) ? item.attachments.map((url: string, attachmentIndex: number) => <PrimaryButton key={`${url}-${attachmentIndex}`} title={`فتح المرفق ${attachmentIndex + 1}`} icon="attach-outline" tone="blue" onPress={() => { try { const parsed = new URL(url); if (parsed.protocol !== 'https:') throw new Error(); void Linking.openURL(parsed.toString()).catch(() => fail('تعذر فتح المرفق.')); } catch { fail('رابط المرفق غير صالح.'); } }} />) : null}
      <PrimaryButton title={selected?.id === item.id && summary ? 'تم إنشاء الملخص' : 'إنشاء ملخص بالذكاء الاصطناعي'} icon="sparkles-outline" onPress={() => void makeSummary(item)} loading={loading && selected?.id === item.id} disabled={!item.id || !item.content?.trim()} />
      {selected?.id === item.id && summary ? <View style={styles.summary}><Text style={styles.rowTitle}>{summary.title ?? `ملخص ${item.title ?? 'الدرس'}`}</Text>{Array.isArray(summary.keyPoints) ? summary.keyPoints.map((point: string, pointIndex: number) => <Text key={`p-${pointIndex}`} style={styles.copy}>• {point}</Text>) : null}{Array.isArray(summary.concepts) ? summary.concepts.map((concept: string, conceptIndex: number) => <Text key={`c-${conceptIndex}`} style={styles.copy}>• مفهوم: {concept}</Text>) : null}</View> : null}
    </Surface>) : <EmptyState title="لا توجد دروس منشورة" detail="ستظهر الدروس التي أتاحها المعلم لهذا الحساب هنا." icon="reader-outline" />}
  </View>;
}

export function StudentAiTutorWorkspace({ fail }: { fail: (message: string) => void }) {
  const router = useRouter();
  const [data, setData] = useState<Row>({});
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await apiClient.get('/ai/weakness-map/me')).data?.data ?? {}); }
    catch (error) { fail(messageOf(error)); }
    finally { setLoading(false); }
  }, [fail]);
  useEffect(() => { void load(); }, [load]);
  const topics = Array.isArray(data.topics) ? data.topics : [];
  return <View style={styles.stack}>
    <Surface style={styles.card}><SectionHeading title="المعلم الذكي"/><Text style={styles.copy}>مؤشرات دراستك والتوصيات المحفوظة في حساب الطالب، ثم يمكنك متابعة السؤال مع مساعد نكسس.</Text><PrimaryButton title="محادثة المساعد الذكي" icon="chatbubbles-outline" onPress={() => router.push('/(tabs)/assistant' as never)} /></Surface>
    <Surface style={styles.card}><SectionHeading title="خريطة المواد التي تحتاج دعمًا" action={<TouchableOpacity accessibilityRole="button" onPress={() => void load()}><Ionicons name="refresh-outline" size={19} color={BRAND.teal}/></TouchableOpacity>}/>{loading ? <ActivityIndicator color={BRAND.teal}/> : topics.length ? topics.map((item: Row, index: number) => <View key={item.id ?? item.topic ?? index} style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>{item.topic ?? item.subject ?? 'محور دراسي'}</Text><Text style={styles.copy}>{item.description ?? 'توصية دعم'}</Text></View><Text style={styles.score}>{item.score == null ? '—' : `${item.score}٪`}</Text></View>) : <EmptyState title="لا توجد مؤشرات كافية بعد" detail={data.learningPath ?? 'تظهر خريطة الدعم عندما تتوفر درجات ومحاولات مرتبطة بحسابك.'} icon="analytics-outline"/>}{Array.isArray(data.recommendations) ? data.recommendations.map((item: string, index: number) => <Text key={index} style={styles.copy}>• {item}</Text>) : null}</Surface>
  </View>;
}

export function SubscriptionWorkspace() {
  return <Surface style={styles.card}><View style={styles.emptyIcon}><Ionicons name="card-outline" size={23} color={BRAND.muted}/></View><Text style={styles.rowTitle}>لا توجد خطط اشتراك متاحة</Text><Text style={styles.copy}>لا يوجد كتالوج خطط أو مسار دفع مفعّل لهذا الحساب حاليًا. للاستفسار عن الرسوم المعتمدة، تواصل مع إدارة المدرسة.</Text></Surface>;
}

export function TeacherRiskReportWorkspace({ fail }: { fail: (message: string) => void }) {
  const [classes, setClasses] = useState<Row[]>([]);
  const [classId, setClassId] = useState('');
  const [warnings, setWarnings] = useState<Row[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    void apiClient.get('/classes').then(({ data }) => {
      if (!active) return;
      const entries = listOf(data);
      setClasses(entries);
      setClassId(entries[0]?.id ?? '');
    }).catch((error) => fail(messageOf(error))).finally(() => { if (active) setLoadingClasses(false); });
    return () => { active = false; };
  }, [fail]);
  const load = useCallback(async () => {
    if (!classId) { setWarnings([]); return; }
    setLoading(true);
    try { setWarnings(listOf((await apiClient.get('/analytics/student/early-warnings', { params: { classId } })).data)); }
    catch (error) { fail(messageOf(error)); setWarnings([]); }
    finally { setLoading(false); }
  }, [classId, fail]);
  useEffect(() => { void load(); }, [load]);
  return <View style={styles.stack}>
    <Surface style={styles.card}><SectionHeading title="إنذارات المتابعة الأكاديمية"/><Text style={styles.copy}>مؤشرات مستندة إلى سجلات الحضور والدرجات والواجبات المحفوظة للفصل.</Text>{classes.map((item) => <ChoiceButton key={item.id} title={item.name ?? 'فصل'} selected={classId === item.id} onPress={() => setClassId(item.id)} />)}{!loadingClasses && !classes.length ? <EmptyState title="لا توجد فصول مسندة" detail="لا يمكن حساب مؤشرات المتابعة قبل إسناد فصل للمعلم." icon="albums-outline"/> : null}</Surface>
    {loading ? <ActivityIndicator color={BRAND.teal}/> : warnings.length ? warnings.map((warning, index) => <Surface key={warning.studentId ?? index} style={styles.card}><Text style={styles.rowTitle}>{warning.studentName ?? 'طالب'} · {warning.className ?? ''}</Text><Text style={styles.copy}>مستوى المتابعة: {warning.riskLevel ?? 'غير محدد'}</Text>{Array.isArray(warning.alerts) ? warning.alerts.map((alert: Row, alertIndex: number) => <View key={`${alert.type}-${alertIndex}`} style={styles.row}><Ionicons name="alert-circle-outline" size={17} color={alert.severity === 'HIGH' ? BRAND.red : BRAND.amber}/><Text style={styles.copy}>{alert.message ?? 'مؤشر للمتابعة'} · {alert.value ?? '—'} · الحد {alert.threshold ?? '—'}</Text></View>) : null}</Surface>) : !loadingClasses && classId ? <EmptyState title="لا توجد إنذارات مسجلة" detail="لا توجد مؤشرات تحتاج متابعة ضمن سجلات الفصل المحدد." icon="shield-checkmark-outline"/> : null}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 12 }, card: { gap: 10 }, row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderColor: BRAND.line }, rowCopy: { flex: 1, alignItems: 'flex-end', gap: 3 }, rowTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' }, copy: { color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' }, sectionLabel: { color: BRAND.ink, fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', marginTop: 4 }, summary: { gap: 6, padding: 11, borderRadius: 12, backgroundColor: BRAND.tealSoft }, score: { color: BRAND.teal, fontSize: 15, fontWeight: '900' }, emptyIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', borderRadius: 13, backgroundColor: BRAND.canvas },
});
