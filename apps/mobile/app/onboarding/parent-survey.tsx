import React, { useMemo, useState } from 'react';
import { Switch, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppPage, BrandHeader, ChoiceButton, ErrorNotice, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

const sections = [
  { title: 'صحة الطالب وعاداته', questions: [
    { id: 'q1', text: 'ما عمر الطالب الحالي؟', options: ['أقل من 6 سنوات', '6 إلى 10 سنوات', '11 إلى 15 سنة', 'أكثر من 15 سنة'] },
    { id: 'q2', text: 'هل توجد حالة صحية أو حساسية تحتاج المدرسة إلى معرفتها؟', options: ['لا توجد', 'حساسية طعام', 'حالة صحية تحتاج متابعة'] },
    { id: 'q3', text: 'كم ساعة ينام الطالب في المتوسط؟', options: ['9 إلى 10 ساعات', '7 إلى 8 ساعات', 'أقل من 7 ساعات'] },
    { id: 'q4', text: 'ما متوسط الوقت اليومي أمام الشاشات؟', options: ['أقل من ساعة', 'ساعة إلى ساعتين', 'أكثر من ساعتين'] },
  ] },
  { title: 'التواصل والقراءة', questions: [
    { id: 'q5', text: 'كيف يعبّر الطالب عن نفسه؟', options: ['بطلاقة', 'يحتاج إلى تشجيع', 'يواجه صعوبة أحياناً'] },
    { id: 'q6', text: 'ما مدى اهتمامه بالقصص والكتب؟', options: ['اهتمام كبير', 'اهتمام متوسط', 'يفضل أنشطة أخرى'] },
    { id: 'q7', text: 'هل توجد صعوبات في نطق بعض الحروف؟', options: ['لا توجد', 'أحياناً', 'توجد صعوبة ملحوظة'] },
  ] },
  { title: 'التفاعل والتعلّم', questions: [
    { id: 'q8', text: 'كيف يتعامل الطالب مع زملائه الجدد؟', options: ['يندمج بسهولة', 'يحتاج وقتاً للاندماج', 'يفضل الأنشطة الفردية'] },
    { id: 'q9', text: 'كيف يستجيب للتوجيهات؟', options: ['بمرونة غالباً', 'يحتاج إلى تذكير', 'يحتاج إلى متابعة إضافية'] },
    { id: 'q10', text: 'كيف ينتظر دوره في الأنشطة الجماعية؟', options: ['بهدوء', 'يحتاج تذكيراً بسيطاً', 'يجد صعوبة في الانتظار'] },
    { id: 'q11', text: 'كيف يركز في نشاط تعليمي قصير؟', options: ['يركز باستمرار', 'يتشتت أحياناً', 'يحتاج فواصل حركة'] },
    { id: 'q12', text: 'كيف يتعامل مع مسألة أو نشاط صعب؟', options: ['يحاول مرة أخرى', 'يطلب المساعدة', 'ينزعج ويحتاج تشجيعاً'] },
    { id: 'q13', text: 'كيف يلتزم بالروتين المنزلي؟', options: ['ملتزم غالباً', 'يحتاج تذكيراً', 'يحتاج متابعة مستمرة'] },
  ] },
  { title: 'الشراكة الأسرية', questions: [
    { id: 'q14', text: 'من يتابع واجبات الطالب في المنزل غالباً؟', options: ['الأب والأم معاً', 'الأم غالباً', 'الأب غالباً', 'شخص آخر'] },
    { id: 'q15', text: 'ما الهدف الأهم للأسرة هذا الفصل؟', options: ['التحصيل الدراسي', 'بناء الشخصية والثقة', 'تنمية المهارات الأساسية', 'جميع ما سبق'] },
  ] },
];

export default function ParentSurveyScreen() {
  const { user, refreshProfile } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const totalQuestions = useMemo(() => sections.reduce((sum, section) => sum + section.questions.length, 0), []);
  const answered = Object.keys(answers).length;

  const submit = async () => {
    if (answered !== totalQuestions) return setError('أجب عن جميع الأسئلة قبل الإرسال.');
    if (!consent) return setError('أكد موافقتك قبل إرسال الاستبيان.');
    if (!user?.onboardingStudentId) return setError('لم يظهر الطالب المرتبط بهذا الحساب. ارجع لخطوة الربط وحاول مرة أخرى.');
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/users/parent-survey', { studentId: user.onboardingStudentId, answers, consent: true });
      await refreshProfile();
    } catch (submitError: any) {
      const message = submitError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join('، ') : message || 'تعذر حفظ الاستبيان. لم يتم اعتماد الإجابات.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPage>
      <BrandHeader />
      <Animated.View entering={FadeInDown.duration(350)} style={styles.body}>
        <View style={styles.headingRow}><View style={styles.icon}><Ionicons name="heart-outline" size={23} color={BRAND.amber} /></View><View style={styles.heading}><ScreenTitle title="استبيان ولي الأمر" subtitle="إجاباتك تساعد المدرسة على فهم احتياجات الطالب. لا يمثل هذا الاستبيان تشخيصًا طبيًا أو نفسيًا." /></View></View>
        <View style={styles.progress}><Text style={styles.progressText}>{answered} من {totalQuestions} إجابة</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(answered / totalQuestions) * 100}%` }]} /></View></View>
        {sections.map((section) => (
          <Surface key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.questions.map((question) => (
              <View key={question.id} style={styles.question}>
                <Text style={styles.questionText}>{question.text}</Text>
                <View style={styles.options}>{question.options.map((option) => <ChoiceButton key={option} title={option} selected={answers[question.id] === option} onPress={() => setAnswers((current) => ({ ...current, [question.id]: option }))} />)}</View>
              </View>
            ))}
          </Surface>
        ))}
        <Surface style={styles.consentRow}>
          <View style={styles.consentCopy}><Text style={styles.consentTitle}>الموافقة على حفظ الإجابات</Text><Text style={styles.consentText}>أوافق على حفظ الإجابات ضمن ملف الطالب وإتاحتها للمختصين المخولين بالمدرسة.</Text></View>
          <Switch value={consent} onValueChange={setConsent} trackColor={{ false: '#CAD3DC', true: '#83CFC0' }} thumbColor={consent ? BRAND.teal : '#FFFFFF'} accessibilityLabel="الموافقة على حفظ إجابات الاستبيان" />
        </Surface>
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        <PrimaryButton title="حفظ الاستبيان ومتابعة" icon="checkmark" onPress={() => void submit()} loading={submitting} tone="blue" />
      </Animated.View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  body: { gap: 13, marginTop: 18 },
  headingRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 11, marginBottom: 4 },
  heading: { flex: 1 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: BRAND.amberSoft },
  progress: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line },
  progressText: { color: BRAND.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#EDF1F4', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: BRAND.blue },
  section: { gap: 15, padding: 15 },
  sectionTitle: { color: BRAND.blue, fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  question: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderColor: '#EFF2F4' },
  questionText: { color: BRAND.ink, fontSize: 14, lineHeight: 22, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  options: { gap: 6 },
  consentRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  consentCopy: { flex: 1, gap: 4 },
  consentTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  consentText: { color: BRAND.muted, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
});
