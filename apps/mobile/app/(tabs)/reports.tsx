import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { AppPage, BrandHeader, EmptyState, ErrorNotice, PrimaryButton, SectionHeading, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { buildBrandedReportHtml, escapePdfHtml } from '@/lib/report-pdf';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

type ReportLine = { label: string; value: string };
type ReportRow = { title: string; detail: string };
type ReportSection = { title: string; lines?: ReportLine[]; rows?: ReportRow[] };
type ReportData = { title: string; sections: ReportSection[]; generatedAt: string };
type ParentReport = {
  studentInfo?: { name?: string; class?: string; period?: string };
  summary?: { overallGrade?: number | null; attendanceRate?: number | null; assignmentsCompleted?: number; totalAssignments?: number; rank?: number | null; totalStudents?: number };
  subjects?: Array<{ name: string; grade: number; trend: string }>;
  attendance?: { present?: number; absent?: number; late?: number; excused?: number };
  recentGrades?: Array<{ subject: string; assignment: string; score: number; maxScore: number; date: string | Date }>;
  recommendations?: string[];
};

const roleTitle: Record<string, string> = {
  STUDENT: 'تقرير الطالب', PARENT: 'تقارير الأبناء', TEACHER: 'تقرير المعلم', ADMIN: 'تقرير إدارة المدرسة',
  PRINCIPAL: 'تقرير مدير المدرسة', VICE_PRINCIPAL: 'تقرير وكيل المدرسة', COUNSELOR: 'تقرير التوجيه الطلابي',
  SUPERVISOR: 'تقرير الإشراف التربوي', ACCOUNTANT: 'التقرير المالي', HR: 'تقرير الموارد البشرية',
};

const surveyQuestionLabels: Record<string, string> = {
  q1: 'عمر الطالب', q2: 'الحالة الصحية أو الحساسية', q3: 'ساعات النوم', q4: 'وقت الشاشات',
  q5: 'التعبير عن النفس', q6: 'الاهتمام بالقراءة', q7: 'نطق الحروف', q8: 'الاندماج مع الزملاء',
  q9: 'الاستجابة للتوجيهات', q10: 'انتظار الدور', q11: 'التركيز', q12: 'التعامل مع التحدي',
  q13: 'الالتزام بالروتين', q14: 'متابعة الواجبات في المنزل', q15: 'هدف الأسرة للفصل',
};

function placementReportSection(payload: any): ReportSection | null {
  const attempts = Array.isArray(payload?.items) ? payload.items : [];
  if (!payload || !attempts.length) return payload ? { title: 'اختبارات تحديد المستوى', lines: [{ label: 'النتائج', value: 'لا توجد اختبارات مكتملة' }] } : null;
  return {
    title: 'إجابات اختبار تحديد المستوى ونقاط الدعم',
    lines: [{ label: 'عدد الاختبارات', value: fmt(payload.total ?? attempts.length) }],
    rows: attempts.flatMap((attempt: any) => [
      { title: `${attempt.studentName ?? 'ملف الطالب'} · ${fmt(attempt.score)}٪`, detail: `النتيجة ${fmt(attempt.correctCount)} من ${fmt(attempt.questionCount)} · ${attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString('ar-SA') : '—'}${attempt.weakAreas?.length ? ` · يحتاج دعمًا في: ${attempt.weakAreas.map((area: any) => `${area.category} (${area.accuracy}٪)`).join('، ')}` : ' · لم تُرصد إجابات خاطئة في المحاور المسجلة'}` },
      ...(attempt.answers ?? []).map((answer: any, index: number) => ({
        title: `${attempt.studentName ?? 'الطالب'} · سؤال ${index + 1}: ${answer.prompt ?? ''}`,
        detail: `المحور: ${answer.category ?? 'عام'} · إجابة الطالب: ${answer.selectedAnswer ?? 'بلا إجابة'} · الإجابة الصحيحة: ${answer.correctAnswer ?? 'غير متاحة'} · ${answer.isCorrect ? 'صحيح' : 'يحتاج مراجعة'}${answer.explanation ? ` · ${answer.explanation}` : ''}`,
      })),
      ...(attempt.weakAreas ?? []).map((area: any) => ({ title: `محور يحتاج دعمًا: ${area.category}`, detail: `${area.correct} صحيح من ${area.total} · الدقة ${area.accuracy}٪` })),
    ]),
  };
}

function intakeSurveySection(payload: any): ReportSection | null {
  const surveys = arrayPayload<any>(payload);
  if (!payload) return null;
  return {
    title: 'إجابات استبيان بيانات الطالب',
    lines: [{ label: 'عدد الاستبيانات', value: fmt(payload?.meta?.total ?? surveys.length) }],
    rows: surveys.flatMap((survey) => {
      const answers = survey.answers && typeof survey.answers === 'object' ? survey.answers as Record<string, string> : {};
      const respondent = survey.respondent?.name ?? survey.parent?.name ?? (survey.respondentRole === 'STUDENT' ? 'الطالب' : 'ولي الأمر');
      const student = survey.student?.name ?? 'الطالب';
      return [
        { title: `${student} · أُجيب بواسطة ${respondent}`, detail: `آخر تحديث ${survey.updatedAt ? new Date(survey.updatedAt).toLocaleDateString('ar-SA') : '—'} · الإصدار ${survey.consentVersion ?? '—'}` },
        ...Object.entries(answers).sort(([left], [right]) => left.localeCompare(right, 'en', { numeric: true })).map(([id, answer]) => ({ title: surveyQuestionLabels[id] ?? `السؤال ${id}`, detail: answer })),
      ];
    }),
  };
}

function aiListSection(payload: any, title: string, listKey: string, rowTitle: string, emptyText: string): ReportSection | null {
  if (!payload) return null;
  const data = payload?.data ?? payload;
  const values = Array.isArray(data?.[listKey]) ? data[listKey].filter((value: unknown) => typeof value === 'string') : [];
  return {
    title,
    rows: values.length
      ? values.map((value: string) => ({ title: rowTitle, detail: value }))
      : [{ title: rowTitle, detail: emptyText }],
  };
}

function weaknessMapSection(payload: any, studentName: string): ReportSection | null {
  if (!payload) return null;
  const data = payload?.data ?? payload;
  const topics = Array.isArray(data?.topics) ? data.topics : [];
  return {
    title: `خريطة المواد التي تحتاج دعمًا · ${studentName}`,
    rows: [
      ...topics.map((topic: any) => ({ title: topic.topic ?? 'مادة', detail: `${fmt(topic.description)} · مؤشر الضعف ${fmt(topic.score)}٪` })),
      ...(data.learningPath ? [{ title: 'مسار التحسين', detail: String(data.learningPath) }] : []),
      ...(Array.isArray(data.recommendations) ? data.recommendations.map((item: string) => ({ title: 'توصية', detail: item })) : []),
      ...(!topics.length && !data.learningPath ? [{ title: 'النتيجة', detail: 'لا توجد بيانات كافية لبناء خريطة دعم.' }] : []),
    ],
  };
}

function riskSection(payload: any, studentName: string): ReportSection | null {
  if (!payload) return null;
  const data = payload?.data ?? payload;
  const indicators = data?.indicators && typeof data.indicators === 'object' ? Object.entries(data.indicators) : [];
  const labels: Record<string, string> = { attendance: 'الحضور', gradesTrend: 'اتجاه الدرجات', assignmentCompletion: 'الواجبات' };
  return {
    title: `مؤشرات المتابعة · ${studentName}`,
    lines: [
      { label: 'مستوى المتابعة', value: fmt(data?.riskLevel) },
      { label: 'مؤشر المتابعة', value: data?.riskScore == null ? 'بيانات غير كافية' : `${fmt(data.riskScore)}٪` },
    ],
    rows: [
      ...indicators.map(([key, raw]: [string, any]) => ({ title: labels[key] ?? key, detail: `${raw?.detail ?? 'لا توجد تفاصيل'} · ${fmt(raw?.score)}٪` })),
      ...(data?.recommendation ? [{ title: 'الإجراء المقترح', detail: String(data.recommendation) }] : []),
    ],
  };
}

function parentAdviceSection(payload: any, studentName: string): ReportSection | null {
  if (!payload) return null;
  const data = payload?.data ?? payload;
  return {
    title: `إرشادات الأسرة · ${studentName}`,
    lines: [{ label: 'الحالة العامة', value: fmt(data?.overallStatus) }],
    rows: [
      ...(data?.summary ? [{ title: 'الملخص', detail: String(data.summary) }] : []),
      ...(['positives', 'concerns', 'actionableAdvice'] as const).flatMap((key) => {
        const labels = { positives: 'نقطة قوة', concerns: 'تحتاج متابعة', actionableAdvice: 'نصيحة عملية' };
        return Array.isArray(data?.[key]) ? data[key].map((item: string) => ({ title: labels[key], detail: item })) : [];
      }),
    ],
  };
}

function errText(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر جلب التقرير من سجلات المدرسة.';
}

function fmt(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString('ar-SA');
  return String(value);
}

function recordLines(record: unknown, labels: Record<string, string> = {}): ReportLine[] {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return [];
  return Object.entries(record as Record<string, unknown>).flatMap(([key, value]) => {
    if (value && typeof value === 'object') return recordLines(value, labels).map((line) => ({ ...line, label: `${labels[key] ?? key} · ${line.label}` }));
    if (typeof value === 'number' || typeof value === 'string' || value === null) return [{ label: labels[key] ?? key, value: fmt(value) }];
    return [];
  });
}

function parentReportSection(report: ParentReport, nameOverride?: string): ReportSection {
  const summary = report.summary ?? {};
  return {
    title: `ملف ${nameOverride ?? report.studentInfo?.name ?? 'الطالب'} · ${report.studentInfo?.class ?? 'بدون فصل'}`,
    lines: [
      { label: 'متوسط الدرجات', value: summary.overallGrade == null ? 'لا توجد درجات' : `${summary.overallGrade}٪` },
      { label: 'نسبة الحضور', value: summary.attendanceRate == null ? 'لا توجد سجلات' : `${summary.attendanceRate}٪` },
      { label: 'الواجبات المكتملة', value: `${fmt(summary.assignmentsCompleted)} من ${fmt(summary.totalAssignments)}` },
      { label: 'ترتيب الفصل', value: summary.rank == null ? 'غير متاح' : `${summary.rank} من ${fmt(summary.totalStudents)}` },
      { label: 'الفترة', value: fmt(report.studentInfo?.period) },
      { label: 'الحضور', value: `حاضر ${fmt(report.attendance?.present)} · غائب ${fmt(report.attendance?.absent)} · متأخر ${fmt(report.attendance?.late)} · بعذر ${fmt(report.attendance?.excused)}` },
    ],
    rows: [
      ...(report.subjects ?? []).map((subject) => ({ title: subject.name, detail: `الدرجة ${fmt(subject.grade)}٪ · ${subject.trend === 'UP' ? 'تحسن' : subject.trend === 'DOWN' ? 'تراجع' : subject.trend === 'STABLE' ? 'مستقر' : 'لا توجد مقارنة سابقة'}` })),
      ...(report.recentGrades ?? []).map((grade) => ({ title: `${grade.subject} · ${grade.assignment}`, detail: `${fmt(grade.score)} / ${fmt(grade.maxScore)} · ${new Date(grade.date).toLocaleDateString('ar-SA')}` })),
      ...(report.recommendations ?? []).map((recommendation) => ({ title: 'توصية', detail: recommendation })),
    ],
  };
}

function arrayPayload<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function htmlEscape(value: string) {
  return escapePdfHtml(value);
}

function reportHtml(report: ReportData) {
  const content = report.sections.map((section) => `<section class="report-section"><h2>${htmlEscape(section.title)}</h2>${section.lines?.length ? `<table><tbody>${section.lines.map((line) => `<tr><th>${htmlEscape(line.label)}</th><td>${htmlEscape(line.value)}</td></tr>`).join('')}</tbody></table>` : ''}${section.rows?.length ? `<div class="rows">${section.rows.map((row) => `<article><strong>${htmlEscape(row.title)}</strong><p>${htmlEscape(row.detail)}</p></article>`).join('')}</div>` : ''}${!section.lines?.length && !section.rows?.length ? '<p class="muted">لا توجد سجلات مسجلة خلال الفترة.</p>' : ''}</section>`).join('');
  return buildBrandedReportHtml({
    title: report.title,
    subtitle: 'تقارير حسب بيانات النظام',
    content,
    issuedAt: new Date(report.generatedAt).toLocaleString('ar-SA'),
  });
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');

  const load = useCallback(async () => {
    if (!user?.role) return;
    setLoading(true);
    setError('');
    const sections: ReportSection[] = [];
    const failures: string[] = [];
    const request = async <T,>(url: string, title: string): Promise<T | null> => {
      try { return (await apiClient.get<T>(url)).data; }
      catch (requestError) { failures.push(`${title}: ${errText(requestError)}`); return null; }
    };
    const postRequest = async <T,>(url: string, body: unknown, title: string): Promise<T | null> => {
      try { return (await apiClient.post<T>(url, body)).data; }
      catch (requestError) { failures.push(`${title}: ${errText(requestError)}`); return null; }
    };
    try {
      switch (user.role) {
        case 'STUDENT': {
          const [data, placement, surveys, insights, risk, weakness] = await Promise.all([
            user.id ? request<ParentReport>(`/analytics/student/${encodeURIComponent(user.id)}/parent-report?period=month`, 'ملف الطالب') : Promise.resolve(null),
            request<any>('/assessments/placement/reports?page=1&limit=100', 'إجابات اختبار تحديد المستوى'),
            request<any>('/users/me/intake-surveys', 'استبيان بيانات الطالب'),
            request<any>('/ai/student-insights/me', 'تحليل الأداء الذكي'),
            user.id ? request<any>(`/ai/learning-risk/${encodeURIComponent(user.id)}`, 'مؤشرات المتابعة') : Promise.resolve(null),
            request<any>('/ai/weakness-map/me', 'خريطة نقاط الدعم'),
          ]);
          if (data) sections.push(parentReportSection(data));
          const placementSection = placementReportSection(placement);
          const surveySection = intakeSurveySection(surveys);
          if (placementSection) sections.push(placementSection);
          if (surveySection) sections.push(surveySection);
          const studentInsights = insights?.data ?? insights;
          const strengths = aiListSection(insights, 'نقاط القوة في الأداء', 'strengths', 'نقطة قوة', 'لم يرصد التحليل نقطة قوة إضافية من السجلات المتاحة.');
          const weaknesses = aiListSection(insights, 'جوانب تحتاج متابعة', 'weaknesses', 'جانب يحتاج متابعة', 'لم يرصد التحليل جانبًا إضافيًا يحتاج متابعة.');
          const topics = aiListSection(insights, 'موضوعات مقترحة للمراجعة', 'recommendedTopics', 'موضوع للمراجعة', 'لا توجد موضوعات مراجعة مقترحة حاليًا.');
          if (strengths) sections.push(strengths);
          if (weaknesses) sections.push(weaknesses);
          if (topics) sections.push(topics);
          if (studentInsights?.encouragementMessage) sections.push({ title: 'رسالة تشجيع', rows: [{ title: 'من تحليل الأداء', detail: String(studentInsights.encouragementMessage) }] });
          const riskDetails = riskSection(risk, 'الطالب');
          const weaknessDetails = weaknessMapSection(weakness, 'الطالب');
          if (riskDetails) sections.push(riskDetails);
          if (weaknessDetails) sections.push(weaknessDetails);
          const attendance = await request<any>('/attendance', 'الحضور');
          const records = attendance?.history ?? arrayPayload<any>(attendance);
          sections.push({ title: 'سجلات الحضور', lines: [
            { label: 'نسبة الحضور', value: attendance?.summary?.attendanceRate == null ? 'لا توجد سجلات' : `${attendance.summary.attendanceRate}٪` },
            { label: 'حاضر', value: fmt(attendance?.summary?.present) }, { label: 'غائب', value: fmt(attendance?.summary?.absent) },
            { label: 'متأخر', value: fmt(attendance?.summary?.late) }, { label: 'عدد السجلات', value: fmt(records.length) },
          ], rows: records.slice(0, 30).map((row: any) => ({ title: row.subject ?? row.class?.name ?? row.className ?? 'سجل حضور', detail: `${fmt(row.status)} · ${row.date ? new Date(row.date).toLocaleDateString('ar-SA') : '—'}` })) });
          break;
        }
        case 'PARENT': {
          const [dashboard, placement, surveys] = await Promise.all([
            request<any>('/dashboard/parent', 'الأبناء'),
            request<any>('/assessments/placement/reports?page=1&limit=100', 'اختبارات الأبناء'),
            request<any>('/users/me/intake-surveys', 'استبيانات الأبناء'),
          ]);
          const children = dashboard?.children ?? [];
          if (!children.length) sections.push({ title: 'الأبناء', lines: [{ label: 'الحالة', value: 'لا يوجد أبناء مرتبطون بهذا الحساب' }] });
          const results = await Promise.all(children.map(async (child: any) => {
            const studentId = encodeURIComponent(child.id);
            const [childReport, insights, risk, weakness, advice] = await Promise.all([
              request<ParentReport>(`/analytics/student/${studentId}/parent-report?period=month`, `تقرير ${child.name}`),
              request<any>(`/ai/student-insights/${studentId}`, `تحليل أداء ${child.name}`),
              request<any>(`/ai/learning-risk/${studentId}`, `مؤشرات ${child.name}`),
              request<any>(`/ai/weakness-map/${studentId}`, `خريطة دعم ${child.name}`),
              postRequest<any>('/ai/parent-advice', { studentId: child.id }, `إرشادات الأسرة لـ ${child.name}`),
            ]);
            return { child, childReport, insights, risk, weakness, advice };
          }));
          for (const { child, childReport, insights, risk, weakness, advice } of results) {
            if (childReport) sections.push(parentReportSection(childReport, child.name));
            const studentInsights = insights?.data ?? insights;
            const strengths = aiListSection(insights, `نقاط القوة · ${child.name}`, 'strengths', 'نقطة قوة', 'لا توجد بيانات كافية لاستخراج نقاط قوة.');
            const weaknesses = aiListSection(insights, `جوانب المتابعة · ${child.name}`, 'weaknesses', 'جانب يحتاج متابعة', 'لا توجد بيانات كافية لاستخراج جوانب متابعة.');
            const topics = aiListSection(insights, `موضوعات للمراجعة · ${child.name}`, 'recommendedTopics', 'موضوع للمراجعة', 'لا توجد موضوعات مقترحة حاليًا.');
            if (strengths) sections.push(strengths);
            if (weaknesses) sections.push(weaknesses);
            if (topics) sections.push(topics);
            if (studentInsights?.encouragementMessage) sections.push({ title: `رسالة تشجيع · ${child.name}`, rows: [{ title: 'من تحليل الأداء', detail: String(studentInsights.encouragementMessage) }] });
            const riskDetails = riskSection(risk, child.name);
            const weaknessDetails = weaknessMapSection(weakness, child.name);
            const adviceDetails = parentAdviceSection(advice, child.name);
            if (riskDetails) sections.push(riskDetails);
            if (weaknessDetails) sections.push(weaknessDetails);
            if (adviceDetails) sections.push(adviceDetails);
          }
          const placementSection = placementReportSection(placement);
          const surveySection = intakeSurveySection(surveys);
          if (placementSection) sections.push(placementSection);
          if (surveySection) sections.push(surveySection);
          break;
        }
        case 'TEACHER': {
          const [classes, assignments, submissions] = await Promise.all([
            request<any>('/classes', 'الفصول'), request<any>('/assignments/my', 'الواجبات'), request<any>('/assignments/submissions/my', 'التسليمات'),
          ]);
          const classRows = arrayPayload<any>(classes);
          const assignmentRows = arrayPayload<any>(assignments);
          const submissionRows = arrayPayload<any>(submissions);
          sections.push({ title: 'عبء التدريس', lines: [{ label: 'الفصول المرتبطة', value: fmt(classRows.length) }, { label: 'الواجبات المسجلة', value: fmt(assignmentRows.length) }, { label: 'التسليمات الواردة', value: fmt(submissionRows.length) }, { label: 'بانتظار التصحيح', value: fmt(submissionRows.filter((row) => !row.gradedAt).length) }], rows: assignmentRows.slice(0, 30).map((row) => ({ title: row.title ?? 'واجب', detail: `${row.subject?.name ?? ''}${row.dueDate ? ` · آخر موعد ${new Date(row.dueDate).toLocaleDateString('ar-SA')}` : ''}` })) });
          const placement = await request<any>('/assessments/placement/reports?page=1&limit=100', 'إجابات الاختبارات التشخيصية');
          const placementSection = placementReportSection(placement);
          if (placementSection) sections.push(placementSection);
          break;
        }
        case 'ADMIN': case 'PRINCIPAL': case 'VICE_PRINCIPAL': {
          const [overview, teachers, classes, enrollment, placement, surveys] = await Promise.all([
            request<any>('/admin/dashboard/overview', 'ملخص المدرسة'), request<any>('/admin/dashboard/teachers', 'أداء المعلمين'),
            request<any>('/admin/dashboard/classes', 'نشاط الفصول'), request<any>('/admin/dashboard/stats/enrollment', 'التسجيل'),
            request<any>('/assessments/placement/reports?page=1&limit=100', 'إجابات اختبارات تحديد المستوى'),
            request<any>('/users/parent-surveys?page=1&limit=100', 'استبيانات بيانات الطلاب'),
          ]);
          if (overview) sections.push({ title: 'مؤشرات المدرسة', lines: recordLines(overview, { stats: 'المدرسة', attendance: 'الحضور', assignments: 'الواجبات' }) });
          const teacherRows = arrayPayload<any>(teachers);
          if (teachers) sections.push({ title: 'أداء المعلمين', lines: [{ label: 'عدد المعلمين في التقرير', value: fmt(teacherRows.length) }], rows: teacherRows.slice(0, 40).map((row) => ({ title: row.teacherName ?? 'معلم', detail: `فصول ${fmt(row.stats?.classesCount)} · مواد ${fmt(row.stats?.subjectsCount)} · واجبات ${fmt(row.stats?.assignmentsCreated)} · متوسط ${row.stats?.avgStudentScore == null ? '—' : `${row.stats.avgStudentScore}٪`}` })) });
          const classRows = arrayPayload<any>(classes);
          if (classes) sections.push({ title: 'نشاط الفصول', lines: [{ label: 'عدد الفصول في التقرير', value: fmt(classRows.length) }], rows: classRows.slice(0, 40).map((row) => ({ title: row.className ?? 'فصل', detail: `طلاب ${fmt(row.studentsCount)} · حضور ${row.avgAttendance == null ? '—' : `${row.avgAttendance}٪`} · متوسط الدرجات ${row.avgGrade == null ? '—' : `${row.avgGrade}٪`} · ${fmt(row.status)}` })) });
          const enrollRows = arrayPayload<any>(enrollment);
          if (enrollment) sections.push({ title: 'التسجيل خلال آخر 12 شهرًا', rows: enrollRows.map((row) => ({ title: fmt(row.name), detail: `${fmt(row.students)} طالب` })) });
          const placementSection = placementReportSection(placement);
          const surveySection = intakeSurveySection(surveys);
          if (placementSection) sections.push(placementSection);
          if (surveySection) sections.push(surveySection);
          break;
        }
        case 'SUPERVISOR': {
          const [teachers, classes] = await Promise.all([request<any>('/admin/dashboard/teachers', 'أداء المعلمين'), request<any>('/admin/dashboard/classes', 'نشاط الفصول')]);
          const teacherRows = arrayPayload<any>(teachers); const classRows = arrayPayload<any>(classes);
          if (teachers) sections.push({ title: 'أداء المعلمين', lines: [{ label: 'عدد المعلمين', value: fmt(teacherRows.length) }], rows: teacherRows.map((row) => ({ title: row.teacherName ?? 'معلم', detail: `فصول ${fmt(row.stats?.classesCount)} · مواد ${fmt(row.stats?.subjectsCount)} · متوسط الدرجات ${row.stats?.avgStudentScore == null ? '—' : `${row.stats.avgStudentScore}٪`}` })) });
          if (classes) sections.push({ title: 'متابعة الفصول', lines: [{ label: 'عدد الفصول', value: fmt(classRows.length) }], rows: classRows.map((row) => ({ title: row.className ?? 'فصل', detail: `طلاب ${fmt(row.studentsCount)} · حضور ${row.avgAttendance == null ? '—' : `${row.avgAttendance}٪`} · ${fmt(row.status)}` })) });
          break;
        }
        case 'COUNSELOR': {
          const [classes, surveys, stats, placement] = await Promise.all([request<any>('/classes', 'الفصول'), request<any>('/users/parent-surveys?page=1&limit=100', 'استبيانات أولياء الأمور'), request<any>('/users/stats', 'مؤشرات الحسابات'), request<any>('/assessments/placement/reports?page=1&limit=100', 'إجابات اختبارات تحديد المستوى')]);
          const classRows = arrayPayload<any>(classes);
          const warningResults = await Promise.all(classRows.map(async (classRow: any) => ({ classRow, warnings: await request<any>(`/analytics/student/early-warnings?classId=${encodeURIComponent(classRow.id)}`, `تنبيهات ${classRow.name}`) })));
          const warnings = warningResults.flatMap(({ classRow, warnings }) => arrayPayload<any>(warnings).map((warning) => ({ ...warning, className: classRow.name })));
          if (stats) sections.push({ title: 'مؤشرات المدرسة', lines: recordLines(stats) });
          if (classes) sections.push({ title: 'التنبيهات المبكرة', lines: [{ label: 'الطلاب ذوو التنبيهات', value: fmt(warnings.length) }], rows: warnings.map((warning) => ({ title: `${warning.studentName} · ${warning.className}`, detail: `مستوى المتابعة: ${fmt(warning.riskLevel)} · ${(warning.alerts ?? []).map((alert: any) => alert.message).join('، ')}` })) });
          const surveySection = intakeSurveySection(surveys);
          const placementSection = placementReportSection(placement);
          if (surveySection) sections.push(surveySection);
          if (placementSection) sections.push(placementSection);
          break;
        }
        case 'ACCOUNTANT': {
          const [financial, invoices] = await Promise.all([request<any>('/admin/dashboard/stats/financial', 'المؤشرات المالية'), request<any>('/payments/school-invoices?page=1&limit=100', 'الفواتير')]);
          const financialRows = arrayPayload<any>(financial); const invoiceRows: any[] = Array.isArray(invoices?.invoices) ? invoices.invoices : arrayPayload<any>(invoices);
          if (financial) sections.push({ title: 'الإيرادات المحصلة خلال آخر 12 شهرًا', lines: [{ label: 'عدد فترات العملة', value: fmt(financialRows.length) }], rows: financialRows.map((row) => ({ title: `${fmt(row.name)} · ${fmt(row.currency)}`, detail: `${fmt(row.total)} ${fmt(row.currency)}` })) });
          if (invoices) sections.push({ title: 'الفواتير', lines: [{ label: 'عدد الفواتير المسترجعة', value: fmt(invoiceRows.length) }], rows: invoiceRows.slice(0, 40).map((row) => ({ title: `${row.student?.name ?? row.studentName ?? 'طالب'} · ${fmt(row.description ?? 'فاتورة')}`, detail: `${fmt(row.amount)} ${fmt(row.currency)} · ${fmt(row.status)} · ${row.createdAt ? new Date(row.createdAt).toLocaleDateString('ar-SA') : ''}` })) });
          break;
        }
        case 'HR': {
          const [stats, staff] = await Promise.all([request<any>('/users/stats', 'مؤشرات الحسابات'), request<any>('/users/staff?page=1&limit=100', 'الموظفون')]);
          if (stats) sections.push({ title: 'مؤشرات القوى العاملة', lines: recordLines(stats) });
          if (staff) { const staffRows = arrayPayload<any>(staff); sections.push({ title: 'سجل الموظفين', lines: [{ label: 'الموظفون في الصفحة', value: fmt(staffRows.length) }, ...(staff?.meta?.total !== undefined ? [{ label: 'إجمالي السجل', value: fmt(staff.meta.total) }] : [])], rows: staffRows.slice(0, 60).map((row) => ({ title: row.name ?? [row.firstName, row.lastName].filter(Boolean).join(' ') ?? row.email, detail: `${fmt(row.role)} · ${row.isActive ? 'نشط' : 'غير نشط'} · آخر ظهور ${row.lastActiveDate ? new Date(row.lastActiveDate).toLocaleString('ar-SA') : 'غير مسجل'}` })) }); }
          break;
        }
        default:
          failures.push('لا يوجد تقرير معتمد لهذا الدور.');
      }
      if (!sections.length) setError(failures.join('\n') || 'لا توجد بيانات تقرير متاحة لهذا الحساب.');
      else {
        setReport({ title: roleTitle[user.role] ?? 'تقرير نكسس', sections, generatedAt: new Date().toISOString() });
        if (failures.length) setError(`بعض مصادر البيانات لم تستجب:\n${failures.join('\n')}`);
      }
    } finally { setLoading(false); }
  }, [user?.id, user?.role]);

  useEffect(() => { void load(); }, [load]);

  const exportPdf = async () => {
    if (!report) return;
    setExporting(true); setExportError('');
    try {
      const file = await Print.printToFileAsync({ html: reportHtml(report) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'مشاركة تقرير نكسس' });
      else await Share.share({ url: file.uri, title: report.title });
    } catch (printError: any) { setExportError(printError?.message || 'تعذر إنشاء ملف PDF.'); }
    finally { setExporting(false); }
  };

  return <AppPage>
    <BrandHeader />
    <View style={styles.heading}><Text style={styles.eyebrow}>تقارير حسب بيانات النظام</Text><Text style={styles.title}>{roleTitle[user?.role ?? ''] ?? 'التقارير'}</Text><Text style={styles.subtitle}>كل رقم وسجل أدناه مسترجع من API المدرسة. إنشاء نسخة PDF مضبوط على ورق A4.</Text></View>
    {loading ? <ActivityIndicator color={BRAND.teal} size="large" style={{ marginVertical: 24 }} /> : null}
    {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {exportError ? <ErrorNotice>{exportError}</ErrorNotice> : null}
    {report ? <>
      {report.sections.map((section, index) => <Surface key={`${section.title}-${index}`}>
        <SectionHeading title={section.title} />
        {section.lines?.map((line) => <View key={line.label} style={styles.line}><Text style={styles.value}>{line.value}</Text><Text style={styles.label}>{line.label}</Text></View>)}
        {section.rows?.length ? section.rows.map((row, rowIndex) => <View key={`${row.title}-${rowIndex}`} style={styles.row}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowDetail}>{row.detail}</Text></View>) : null}
        {!section.lines?.length && !section.rows?.length ? <EmptyState title="لا توجد سجلات" detail="لم يرجع الخادم بيانات لهذا القسم." /> : null}
      </Surface>)}
      <Text style={styles.generated}>تاريخ إنشاء التقرير: {new Date(report.generatedAt).toLocaleString('ar-SA')}</Text>
      <PrimaryButton title="طباعة أو مشاركة PDF A4" icon="document-text-outline" onPress={() => void exportPdf()} loading={exporting} />
    </> : !loading ? <EmptyState title="لا يوجد تقرير متاح" detail="تعذر الحصول على سجلات حقيقية لهذا الدور. راجع رسالة الخطأ واتصال الحساب." icon="bar-chart-outline" /> : null}
  </AppPage>;
}

const styles = StyleSheet.create({
  heading: { gap: 5, alignItems: 'flex-end' },
  eyebrow: { color: BRAND.teal, fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  title: { color: BRAND.ink, fontSize: 24, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: BRAND.muted, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  line: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderColor: BRAND.line },
  label: { color: BRAND.muted, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  value: { color: BRAND.ink, fontSize: 14, fontWeight: '900', textAlign: 'left', writingDirection: 'rtl' },
  row: { gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderColor: BRAND.line },
  rowTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  rowDetail: { color: BRAND.muted, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  generated: { color: BRAND.muted, fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
});
