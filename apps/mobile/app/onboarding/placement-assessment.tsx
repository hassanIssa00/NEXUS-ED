import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppPage, BrandHeader, ChoiceButton, EmptyState, ErrorNotice, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

type Question = { id: string; prompt: string; categoryLabel?: string; visual?: string; options: string[] };
type AssessmentResponse = { gradeLevel: number; foundationalForGradeOne: boolean; assessment: { title: string; subtitle: string; questions: Question[] }; attempt?: { score: number } | null };

export default function PlacementAssessmentScreen() {
  const { refreshProfile } = useAuth();
  const [payload, setPayload] = useState<AssessmentResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<AssessmentResponse>('/assessments/placement/current');
      setPayload(response.data);
      setError('');
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join('، ') : message || 'تعذر تحميل اختبار تحديد المستوى من المنصة.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const questions = payload?.assessment.questions ?? [];
  const question = questions[index];
  const complete = useMemo(() => questions.length > 0 && questions.every((item) => answers[item.id]), [answers, questions]);

  const submit = async () => {
    if (!complete) return setError('أجب عن جميع الأسئلة قبل إرسال الاختبار.');
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/assessments/placement/submit', { answers });
      await refreshProfile();
    } catch (submitError: any) {
      const message = submitError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join('، ') : message || 'تعذر حفظ إجابات الاختبار.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPage>
      <BrandHeader />
      <Animated.View entering={FadeInDown.duration(350)} style={styles.body}>
        {loading ? <ActivityIndicator color={BRAND.teal} size="large" /> : payload ? <>
          <View style={styles.titleRow}><View style={styles.assessmentIcon}><Ionicons name="clipboard-outline" size={23} color={BRAND.teal} /></View><View style={styles.titleText}><ScreenTitle title={payload.assessment.title} subtitle={payload.assessment.subtitle} /></View></View>
          {payload.foundationalForGradeOne ? <View style={styles.info}><Ionicons name="information-circle-outline" size={18} color={BRAND.blue} /><Text style={styles.infoText}>هذا تقييم تأسيسي ولا يغيّر الصف الدراسي أو قرار القبول.</Text></View> : null}
          {payload.attempt ? <Surface><EmptyState icon="checkmark-circle-outline" title="تم تسجيل هذا الاختبار مسبقًا" detail={`النتيجة المسجلة: ${payload.attempt.score}%`} /></Surface> : question ? <Surface>
            <View style={styles.progressRow}><Text style={styles.counter}>السؤال {index + 1} من {questions.length}</Text><Text style={styles.category}>{question.categoryLabel}</Text></View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((index + 1) / questions.length) * 100}%` }]} /></View>
            <Text style={styles.prompt}>{question.prompt}</Text>
            {question.visual && question.visual !== question.prompt ? <View style={styles.visual}><Text style={styles.visualText}>{question.visual}</Text></View> : null}
            <View style={styles.options}>
              {question.options.map((option) => <ChoiceButton key={option} title={option} selected={answers[question.id] === option} onPress={() => setAnswers((current) => ({ ...current, [question.id]: option }))} />)}
            </View>
            <View style={styles.controls}>
              <TouchableOpacity onPress={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0} style={styles.navButton}><Ionicons name="arrow-forward" size={17} color={index === 0 ? '#AAB4BF' : BRAND.ink} /><Text style={styles.navText}>السابق</Text></TouchableOpacity>
              {index < questions.length - 1 ? <TouchableOpacity onPress={() => setIndex((current) => Math.min(questions.length - 1, current + 1))} disabled={!answers[question.id]} style={[styles.navButton, styles.nextButton, !answers[question.id] && styles.disabled]}><Text style={styles.nextText}>التالي</Text><Ionicons name="arrow-back" size={17} color="#FFFFFF" /></TouchableOpacity> : <View style={styles.submitWrap}><PrimaryButton title="إرسال الاختبار" icon="checkmark" onPress={() => void submit()} loading={submitting} disabled={!complete} /></View>}
            </View>
          </Surface> : <EmptyState title="لا يوجد اختبار منشور لهذا الصف" detail="لم نُنشئ اختبارًا بديلًا. تواصل مع المدرسة لمتابعة تفعيل اختبار صفك." />}
        </> : null}
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}
      </Animated.View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, marginTop: 18 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
  titleText: { flex: 1 },
  assessmentIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: BRAND.tealSoft },
  info: { flexDirection: 'row-reverse', gap: 7, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#B9D9FA', borderRadius: 12, backgroundColor: '#EFF7FF' },
  infoText: { flex: 1, color: '#24588D', fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  progressRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  counter: { color: BRAND.muted, fontSize: 12 },
  category: { color: BRAND.teal, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#E8EEF1', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: BRAND.teal },
  prompt: { color: BRAND.ink, fontSize: 19, fontWeight: '800', textAlign: 'right', lineHeight: 30, writingDirection: 'rtl' },
  visual: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: BRAND.line, borderRadius: 10, backgroundColor: '#F8FAFB' },
  visualText: { color: BRAND.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  options: { gap: 8 },
  controls: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: BRAND.line, paddingTop: 12 },
  navButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 10, borderRadius: 11 },
  nextButton: { backgroundColor: BRAND.teal, paddingHorizontal: 16 },
  navText: { color: BRAND.ink, fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  nextText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  submitWrap: { flex: 1, marginStart: 6 },
  disabled: { opacity: 0.45 },
});
