import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PortalFeatureCatalog } from '@/components/PortalFeatureCatalog';
import { SectionHeading, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';

export type TeacherToolAction = 'classes' | 'assignments' | 'attendance' | 'grading' | 'lessons' | 'notifications' | 'reports' | 'games' | 'ai' | 'tools';

const aiTools = [
  { id: 'worksheet', title: 'ورقة عمل وأسئلة', detail: 'أنشئ أسئلة تدريبية من موضوع تختاره.', icon: 'document-text-outline' },
  { id: 'lesson-summary', title: 'تلخيص درس', detail: 'حوّل درسًا محفوظًا أو نصًا إلى ملخص.', icon: 'reader-outline' },
  { id: 'content-pack', title: 'محتوى تفاعلي', detail: 'ملخص ومفاهيم وبطاقات وأنشطة من نص الدرس.', icon: 'albums-outline' },
  { id: 'concept-map', title: 'خريطة مفاهيم', detail: 'مسودة مرتبة من بيانات الدرس وسياقه.', icon: 'git-network-outline' },
  { id: 'learning-strategy', title: 'استراتيجيات تعلم', detail: 'أفكار تدريس مناسبة للموضوع والمرحلة.', icon: 'bulb-outline' },
  { id: 'remedial-plan', title: 'خطة علاجية', detail: 'مسودة خطوات دعم قابلة للمراجعة والتعديل.', icon: 'medkit-outline' },
  { id: 'nafes-practice', title: 'تدريب نافس', detail: 'أسئلة تدريبية للمراجعة، وليست بنكًا رسميًا.', icon: 'school-outline' },
  { id: 'external-analysis', title: 'تحليل نتائج خارجية', detail: 'الصق نتائجًا بعد إزالة بيانات التعريف لتحليلها.', icon: 'analytics-outline' },
  { id: 'learning-patterns', title: 'أنماط التعلم', detail: 'اقتراحات استنادًا إلى مؤشرات حساب المدرسة المتاحة.', icon: 'trending-up-outline' },
  { id: 'weekly-report', title: 'مسودة تقرير أسبوعي', detail: 'أنشئ مسودة من المؤشرات المتاحة لحسابك.', icon: 'calendar-outline' },
  { id: 'portfolio', title: 'شواهد وملف إنجاز', detail: 'نظّم وصفًا للشواهد في مسودة قابلة للحفظ.', icon: 'trophy-outline' },
  { id: 'activity-idea', title: 'فكرة نشاط صفي', detail: 'اقترح نشاطًا وخطوات تنفيذه.', icon: 'sparkles-outline' },
  { id: 'illustration', title: 'صورة تعليمية', detail: 'أنشئ صورة تعليمية من وصف قصير.', icon: 'image-outline' },
] as const;

export function TeacherToolsHub({ onOpen }: { onOpen: (action: string) => void }) {
  return <View style={styles.root}>
    <PortalFeatureCatalog role="TEACHER" onOpen={(feature) => onOpen(feature.tab ?? `feature:${feature.id}`)} />
    <Surface style={styles.aiSection}>
      <SectionHeading title="أدوات نكسس الذكية" />
      <Text style={styles.note}>اختر أداة لفتح مسار إعداد فعلي. مخرجات الذكاء الاصطناعي تظل مسودة للمراجعة، ولا تُنشر على الطلاب تلقائيًا.</Text>
      <View style={styles.grid}>{aiTools.map((tool) => <TouchableOpacity key={tool.id} accessibilityRole="button" activeOpacity={0.82} onPress={() => onOpen(`ai-task:${tool.id}`)} style={styles.card}>
        <View style={styles.icon}><Ionicons name={tool.icon} size={19} color={BRAND.teal} /></View>
        <Text style={styles.cardTitle}>{tool.title}</Text>
        <Text style={styles.cardDetail}>{tool.detail}</Text>
        <Ionicons name="arrow-back" size={15} color={BRAND.blue} style={styles.arrow} />
      </TouchableOpacity>)}</View>
    </Surface>
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 14 }, aiSection: { gap: 10 }, note: { color: BRAND.muted, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 }, card: { width: '48%', minHeight: 124, position: 'relative', alignItems: 'flex-end', gap: 6, padding: 12, borderWidth: 1, borderColor: BRAND.line, borderRadius: 14, backgroundColor: '#FFFFFF' },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: BRAND.tealSoft }, cardTitle: { color: BRAND.ink, fontSize: 12, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' }, cardDetail: { color: BRAND.muted, fontSize: 10, lineHeight: 15, textAlign: 'right', writingDirection: 'rtl' }, arrow: { position: 'absolute', left: 10, bottom: 10 },
});
