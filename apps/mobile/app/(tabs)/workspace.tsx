import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppPage, BrandHeader, ChoiceButton, EmptyState, ErrorNotice, Field, PrimaryButton, SectionHeading, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

type Subject = { id: string; name: string; classId?: string | null; class?: { id: string; name: string } | null; className?: string };
type SchoolClass = { id: string; name: string; students?: Array<{ student: { id: string; name: string; firstName?: string; lastName?: string } }>; _count?: { students: number } };
type Assignment = { id: string; title: string; description?: string | null; dueDate?: string | null; maxScore: number; subject?: { name?: string } | string; status?: string; grade?: number | null; submission?: { id?: string; content?: string | null } | null; _count?: { submissions?: number } };
type Lesson = { id: string; title: string; content?: string | null; videoUrl?: string | null; attachments?: string[]; subject?: { name?: string } };
type Submission = { id: string; content?: string | null; attachments?: string[]; grade?: number | null; feedback?: string | null; gradedAt?: string | null; assignment: { id?: string; title: string; maxScore: number }; student: { name?: string; email?: string } };
type Tab = 'assignments' | 'attendance' | 'grading' | 'ai';
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
type GeneratedQuestion = { question: string; type: 'multiple_choice' | 'true_false'; options?: string[]; correctAnswer: string; explanation?: string };

const tabOptions: Array<{ id: Tab; title: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { id: 'assignments', title: 'الواجبات', icon: 'document-text-outline' },
  { id: 'attendance', title: 'الحضور', icon: 'calendar-outline' },
  { id: 'grading', title: 'التصحيح', icon: 'checkmark-done-outline' },
  { id: 'ai', title: 'مساعد AI', icon: 'sparkles-outline' },
];
const attendanceOptions: Array<{ id: AttendanceStatus; title: string }> = [
  { id: 'PRESENT', title: 'حاضر' }, { id: 'ABSENT', title: 'غائب' }, { id: 'LATE', title: 'متأخر' }, { id: 'EXCUSED', title: 'بعذر' },
];

function errorText(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر إتمام الطلب. لم يتم حفظ بيانات بديلة.';
}

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function PortalWorkspace() {
  const { user } = useAuth();
  if (user?.role === 'TEACHER') return <TeacherWorkspace />;
  if (user?.role === 'STUDENT') return <StudentWorkspace />;
  if (user?.role === 'PARENT') return <ParentWorkspace />;
  if (['ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(user?.role ?? '')) return <SchoolWorkspace />;
  return <UnavailableWorkspace />;
}

export default function WorkspaceScreen() {
  return <PortalWorkspace />;
}

function TeacherWorkspace() {
  const [tab, setTab] = useState<Tab>('assignments');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [subjectResult, classResult, assignmentResult, submissionResult] = await Promise.allSettled([
      apiClient.get<Subject[]>('/subjects/teacher/my'),
      apiClient.get<SchoolClass[]>('/classes'),
      apiClient.get<Assignment[]>('/assignments/my'),
      apiClient.get<Submission[]>('/assignments/submissions/my'),
    ]);
    setSubjects(subjectResult.status === 'fulfilled' ? subjectResult.value.data : []);
    setClasses(classResult.status === 'fulfilled' ? classResult.value.data : []);
    setAssignments(assignmentResult.status === 'fulfilled' ? assignmentResult.value.data : []);
    setSubmissions(submissionResult.status === 'fulfilled' ? submissionResult.value.data : []);
    const failed = [subjectResult, classResult, assignmentResult, submissionResult].filter((result) => result.status === 'rejected');
    setError(failed.length ? errorText((failed[0] as PromiseRejectedResult).reason) : '');
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <AppPage>
      <BrandHeader />
      <View style={styles.pageHeading}><Text style={styles.eyebrow}>مساحة المعلم</Text><Text style={styles.pageTitle}>إدارة العمل اليومي</Text><Text style={styles.pageSubtitle}>موادك وفصولك وعملياتك من سجلات المدرسة.</Text></View>
      <View style={styles.segment}>
        {tabOptions.map((item) => <TouchableOpacity key={item.id} onPress={() => { setTab(item.id); setNotice(''); setError(''); }} style={[styles.segmentItem, tab === item.id && styles.segmentActive]}>
          <Ionicons name={item.icon} size={16} color={tab === item.id ? '#FFFFFF' : BRAND.muted} />
          <Text style={[styles.segmentText, tab === item.id && styles.segmentTextActive]}>{item.title}</Text>
        </TouchableOpacity>)}
      </View>
      {loading ? <ActivityIndicator color={BRAND.teal} size="large" style={{ marginVertical: 24 }} /> : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}
      {notice ? <View style={styles.notice}><Ionicons name="checkmark-circle-outline" size={17} color={BRAND.teal} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
      {tab === 'assignments' ? <TeacherAssignments subjects={subjects} assignments={assignments} reload={load} notify={setNotice} fail={setError} /> : null}
      {tab === 'attendance' ? <TeacherAttendance classes={classes} fail={setError} notify={setNotice} /> : null}
      {tab === 'grading' ? <TeacherGrading submissions={submissions} reload={load} notify={setNotice} fail={setError} /> : null}
      {tab === 'ai' ? <TeacherAi subjects={subjects} fail={setError} notify={setNotice} /> : null}
    </AppPage>
  );
}

function TeacherAssignments({ subjects, assignments, reload, notify, fail }: {
  subjects: Subject[]; assignments: Assignment[]; reload: () => Promise<void>; notify: (value: string) => void; fail: (value: string) => void;
}) {
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!subjectId || !title.trim()) return fail('اختر مادة واكتب عنوان الواجب.');
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return fail('أدخل موعد التسليم بصيغة YYYY-MM-DD.');
    const score = Number(maxScore);
    if (!Number.isFinite(score) || score < 1 || score > 1000) return fail('الدرجة القصوى يجب أن تكون بين 1 و1000.');
    setSaving(true);
    fail('');
    try {
      await apiClient.post('/assignments', { title: title.trim(), description: description.trim() || undefined, subjectId, maxScore: score, ...(dueDate ? { dueDate: new Date(`${dueDate}T23:59:00`).toISOString() } : {}) });
      setTitle(''); setDescription(''); setDueDate('');
      notify('حُفظ الواجب في قاعدة بيانات المدرسة وأُسند إلى المادة المحددة.');
      await reload();
    } catch (error) { fail(errorText(error)); }
    finally { setSaving(false); }
  };

  return <View style={styles.stack}>
    <Surface>
      <SectionHeading title="إنشاء واجب" />
      {subjects.length ? <View style={styles.choiceList}><Text style={styles.fieldLabel}>المادة</Text>{subjects.map((subject) => <ChoiceButton key={subject.id} title={`${subject.name}${subject.class?.name ? ` · ${subject.class.name}` : ''}`} selected={subjectId === subject.id} onPress={() => setSubjectId(subject.id)} />)}</View> : <EmptyState title="لا توجد مواد مسندة لحسابك" detail="لن نستبدلها بمواد تجريبية. اطلب من الإدارة إسناد مادة لفصلك." />}
      <Field label="عنوان الواجب" value={title} onChangeText={setTitle} placeholder="مثال: تدريبات الدرس الثالث" maxLength={200} />
      <Field label="التعليمات" value={description} onChangeText={setDescription} placeholder="تعليمات الواجب للطلاب" multiline style={styles.multiline} />
      <Field label="موعد التسليم (اختياري)" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
      <Field label="الدرجة القصوى" value={maxScore} onChangeText={setMaxScore} keyboardType="decimal-pad" />
      <PrimaryButton title="حفظ الواجب" icon="save-outline" onPress={() => void create()} loading={saving} />
    </Surface>
    <View style={styles.stack}>
      <SectionHeading title="الواجبات المسجلة" />
      {assignments.length ? assignments.map((item) => <Surface key={item.id} style={styles.record}>
        <View style={styles.recordCopy}><Text style={styles.recordTitle}>{item.title}</Text><Text style={styles.recordMeta}>{typeof item.subject === 'string' ? item.subject : item.subject?.name ?? ''} · {item._count?.submissions ?? 0} تسليم</Text></View>
        <View style={styles.scorePill}><Text style={styles.scoreText}>{item.maxScore}</Text><Text style={styles.recordMeta}>درجة</Text></View>
      </Surface>) : <EmptyState title="لا توجد واجبات محفوظة" detail="أنشئ واجبًا بعد اختيار مادة مسندة فعلًا." />}
    </View>
  </View>;
}

function TeacherAttendance({ classes, fail, notify }: { classes: SchoolClass[]; fail: (value: string) => void; notify: (value: string) => void }) {
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [students, setStudents] = useState<Array<{ id: string; name?: string; firstName?: string; lastName?: string }>>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadClassDate = useCallback(async () => {
    if (!classId || !isValidDate(date)) return;
    setLoading(true);
    fail('');
    setStudents([]);
    setStatuses({});
    setNotes({});
    try {
      const response = await apiClient.get<{ students: typeof students; records: Array<{ studentId: string; status: AttendanceStatus; notes?: string }> }>(`/attendance/classes/${encodeURIComponent(classId)}`, { params: { date } });
      setStudents(response.data.students ?? []);
      setStatuses(Object.fromEntries((response.data.records ?? []).map((record) => [record.studentId, record.status])));
      setNotes(Object.fromEntries((response.data.records ?? []).map((record) => [record.studentId, record.notes ?? ''])));
    } catch (error) { fail(errorText(error)); }
    finally { setLoading(false); }
  }, [classId, date, fail]);

  useEffect(() => { void loadClassDate(); }, [loadClassDate]);

  const save = async () => {
    if (!classId) return fail('اختر فصلًا أولًا.');
    if (!isValidDate(date)) return fail('أدخل تاريخًا صحيحًا بصيغة YYYY-MM-DD.');
    if (!students.length) return fail('لا يوجد طلاب مسجلون في هذا الفصل.');
    if (students.some((student) => !statuses[student.id])) return fail('حدد حالة الحضور لكل طالب قبل الحفظ.');
    setSaving(true);
    fail('');
    try {
      const response = await apiClient.post<{ savedCount: number }>(`/attendance/classes/${encodeURIComponent(classId)}`, {
        date,
        entries: students.map((student) => ({ studentId: student.id, status: statuses[student.id], notes: notes[student.id]?.trim() || undefined })),
      });
      notify(`حُفظت سجلات حضور ${response.data.savedCount} طالبًا بتاريخ ${date}.`);
    } catch (error) { fail(errorText(error)); }
    finally { setSaving(false); }
  };

  return <View style={styles.stack}>
    <Surface>
      <SectionHeading title="تسجيل الحضور" />
      <Field label="تاريخ الحضور" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <View style={styles.choiceList}><Text style={styles.fieldLabel}>الفصل</Text>{classes.length ? classes.map((item) => <ChoiceButton key={item.id} title={item.name} selected={classId === item.id} onPress={() => setClassId(item.id)} />) : <EmptyState title="لا توجد فصول مسندة" />}</View>
      {loading ? <ActivityIndicator color={BRAND.teal} /> : null}
      {students.length ? students.map((student) => <View key={student.id} style={styles.studentAttendance}>
        <Text style={styles.recordTitle}>{student.name || [student.firstName, student.lastName].filter(Boolean).join(' ')}</Text>
        <View style={styles.statusRow}>{attendanceOptions.map((option) => <TouchableOpacity key={option.id} onPress={() => setStatuses((current) => ({ ...current, [student.id]: option.id }))} style={[styles.statusOption, statuses[student.id] === option.id && styles.statusSelected]}><Text style={[styles.statusText, statuses[student.id] === option.id && styles.statusTextSelected]}>{option.title}</Text></TouchableOpacity>)}</View>
      </View>) : classId && !loading ? <EmptyState title="لا يوجد طلاب في هذا الفصل" detail="لا يمكن إنشاء سجلات حضور بلا طلاب مرتبطين." /> : null}
      <PrimaryButton title="حفظ سجل الحضور" icon="save-outline" onPress={() => void save()} loading={saving} disabled={!students.length} />
    </Surface>
  </View>;
}

function TeacherGrading({ submissions, reload, notify, fail }: { submissions: Submission[]; reload: () => Promise<void>; notify: (value: string) => void; fail: (value: string) => void }) {
  const [drafts, setDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [busyId, setBusyId] = useState('');

  const update = (id: string, field: 'score' | 'feedback', value: string) => setDrafts((current) => ({ ...current, [id]: { score: current[id]?.score ?? '', feedback: current[id]?.feedback ?? '', [field]: value } }));
  const suggest = async (submission: Submission) => {
    setBusyId(submission.id); fail('');
    try {
      const response = await apiClient.post<{ success: boolean; data: { score: number; feedback: string; maxScore: number } }>(`/ai/grade/${encodeURIComponent(submission.id)}`);
      const suggestion = response.data.data;
      setDrafts((current) => ({ ...current, [submission.id]: { score: String(suggestion.score), feedback: suggestion.feedback } }));
      notify(`اقتراح AI جاهز من  ${suggestion.maxScore} درجة. لم تُحفظ الدرجة؛ راجعها ثم اعتمدها.`);
    } catch (error) { fail(errorText(error)); }
    finally { setBusyId(''); }
  };
  const grade = async (submission: Submission) => {
    if (submission.gradedAt) return fail('هذا التسليم تم تصحيحه بالفعل.');
    const draft = drafts[submission.id];
    const score = Number(draft?.score);
    if (!Number.isFinite(score) || score < 0 || score > submission.assignment.maxScore) return fail(`أدخل درجة بين 0 و${submission.assignment.maxScore}.`);
    setBusyId(submission.id); fail('');
    try {
      await apiClient.patch(`/assignments/submissions/${encodeURIComponent(submission.id)}/grade`, { score, feedback: draft?.feedback || undefined });
      notify('اعتمدت الدرجة وحُفظت في سجل الطالب.');
      await reload();
    } catch (error) { fail(errorText(error)); }
    finally { setBusyId(''); }
  };

  return <View style={styles.stack}>
    <SectionHeading title="التسليمات الواردة" />
    {submissions.length ? submissions.map((item) => <Surface key={item.id} style={styles.submission}>
      <Text style={styles.recordTitle}>{item.assignment.title}</Text>
      <Text style={styles.recordMeta}>{item.student.name || item.student.email} · الدرجة القصوى {item.assignment.maxScore}</Text>
      {item.gradedAt ? <View style={styles.gradeNotice}><Ionicons name="checkmark-circle-outline" size={18} color={BRAND.teal} /><Text style={styles.gradeText}>تم التصحيح · {item.grade ?? '—'} / {item.assignment.maxScore}</Text></View> : null}
      {item.gradedAt && item.feedback ? <Text style={styles.answer}>{item.feedback}</Text> : null}
      {item.content?.trim() ? <Text style={styles.answer}>{item.content}</Text> : <EmptyState title="لا توجد إجابة نصية" detail={item.attachments?.length ? 'هذا التسليم يحتوي مرفقًا؛ راجعه يدويًا.' : 'لم يرسل الطالب نصًا قابلًا للتصحيح.'} />}
      {item.attachments?.length ? <Text style={styles.recordMeta}>عدد المرفقات: {item.attachments.length} · التصحيح الآلي غير متاح للمرفقات.</Text> : null}
      {!item.gradedAt ? <>
        <Field label={`الدرجة من ${item.assignment.maxScore}`} value={drafts[item.id]?.score ?? ''} onChangeText={(value) => update(item.id, 'score', value)} placeholder="الدرجة" keyboardType="decimal-pad" />
        <Field label="ملاحظات المعلم" value={drafts[item.id]?.feedback ?? ''} onChangeText={(value) => update(item.id, 'feedback', value)} placeholder="ملاحظات للطالب" multiline style={styles.multiline} />
        <View style={styles.actions}>
          <PrimaryButton title="اعتماد الدرجة" icon="checkmark" onPress={() => void grade(item)} loading={busyId === item.id} />
          <TouchableOpacity style={[styles.aiAction, (Boolean(item.attachments?.length) || !item.content?.trim()) && styles.disabled]} disabled={Boolean(item.attachments?.length) || !item.content?.trim() || busyId === item.id} onPress={() => void suggest(item)}>
            {busyId === item.id ? <ActivityIndicator size="small" color={BRAND.blue} /> : <Ionicons name="sparkles-outline" size={17} color={BRAND.blue} />}
            <Text style={styles.aiActionText}>اقتراح AI</Text>
          </TouchableOpacity>
        </View>
      </> : null}
    </Surface>) : <EmptyState title="لا توجد تسليمات بانتظار التصحيح" detail="ستظهر هنا إجابات الطلاب الحقيقية بعد إرسال الواجب." />}
  </View>;
}

function TeacherAi({ subjects, fail, notify }: { subjects: Subject[]; fail: (value: string) => void; notify: (value: string) => void }) {
  const [subjectId, setSubjectId] = useState('');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('5');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const subject = subjects.find((item) => item.id === subjectId);

  const generate = async () => {
    if (!subject || !topic.trim()) return fail('اختر مادة مسندة واكتب موضوعًا من المنهج.');
    const questionCount = Number(count);
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 30) return fail('عدد الأسئلة يجب أن يكون بين 1 و30.');
    setLoading(true); fail(''); setQuestions([]);
    try {
      const response = await apiClient.post<{ success: boolean; data: { questions: GeneratedQuestion[] } }>('/ai/generate-exam', {
        subject: subject.name, topic: topic.trim(), questionCount, questionType: 'mixed', difficulty,
        ...(subject.class?.name ? { gradeLevel: subject.class.name } : {}),
      });
      setQuestions(response.data.data.questions ?? []);
      notify('وصلت أسئلة مولدة من خدمة AI. لم تُحفظ كاختبار؛ راجعها قبل استخدامها.');
    } catch (error) { fail(errorText(error)); }
    finally { setLoading(false); }
  };

  return <View style={styles.stack}>
    <Surface>
      <SectionHeading title="إنشاء أسئلة بالذكاء الاصطناعي" />
      <View style={styles.choiceList}><Text style={styles.fieldLabel}>المادة</Text>{subjects.length ? subjects.map((item) => <ChoiceButton key={item.id} title={item.name} selected={subjectId === item.id} onPress={() => setSubjectId(item.id)} />) : <EmptyState title="لا توجد مادة مسندة" />}</View>
      <Field label="موضوع الدرس" value={topic} onChangeText={setTopic} placeholder="اكتب موضوعًا محددًا" />
      <Field label="عدد الأسئلة" value={count} onChangeText={setCount} keyboardType="number-pad" />
      <View style={styles.choiceList}><Text style={styles.fieldLabel}>مستوى الصعوبة</Text><View style={styles.difficulties}>{(['EASY', 'MEDIUM', 'HARD'] as const).map((value, index) => <TouchableOpacity key={value} onPress={() => setDifficulty(value)} style={[styles.difficulty, difficulty === value && styles.difficultyActive]}><Text style={[styles.difficultyText, difficulty === value && styles.difficultyTextActive]}>{['سهل', 'متوسط', 'متقدم'][index]}</Text></TouchableOpacity>)}</View></View>
      <View style={styles.aiDisclaimer}><Ionicons name="information-circle-outline" size={18} color={BRAND.amber} /><Text style={styles.aiDisclaimerText}>الأسئلة المقترحة لا تُحفظ تلقائيًا ولا تُرسل للطلاب. راجع المحتوى وتأكد من مطابقته للمنهج.</Text></View>
      <PrimaryButton title="توليد الأسئلة" icon="sparkles-outline" onPress={() => void generate()} loading={loading} tone="blue" />
    </Surface>
    {questions.map((question, index) => <Surface key={`${index}-${question.question}`} style={styles.questionCard}>
      <Text style={styles.questionNumber}>السؤال {index + 1} · {question.type === 'true_false' ? 'صح أو خطأ' : 'اختيار من متعدد'}</Text>
      <Text style={styles.recordTitle}>{question.question}</Text>
      {question.options?.map((option, optionIndex) => <Text key={`${optionIndex}-${option}`} style={styles.questionOption}>{optionIndex + 1}. {option}{option === question.correctAnswer ? ' · الإجابة المقترحة' : ''}</Text>)}
      {question.type === 'true_false' ? <Text style={styles.questionOption}>الإجابة المقترحة: {question.correctAnswer}</Text> : null}
      {question.explanation ? <Text style={styles.recordMeta}>التفسير: {question.explanation}</Text> : null}
    </Surface>)}
  </View>;
}

function StudentWorkspace() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [parentLinkCode, setParentLinkCode] = useState('');
  const [creatingLinkCode, setCreatingLinkCode] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [assignmentResult, subjectResult, lessonResult] = await Promise.allSettled([
      apiClient.get<Assignment[]>('/assignments/student'), apiClient.get<Subject[]>('/subjects/my'), apiClient.get<Lesson[]>('/lessons'),
    ]);
    setAssignments(assignmentResult.status === 'fulfilled' ? assignmentResult.value.data : []);
    setSubjects(subjectResult.status === 'fulfilled' ? subjectResult.value.data : []);
    setLessons(lessonResult.status === 'fulfilled' ? lessonResult.value.data : []);
    const failed = [assignmentResult, subjectResult, lessonResult].find((result) => result.status === 'rejected');
    setError(failed?.status === 'rejected' ? errorText(failed.reason) : '');
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const submit = async (assignmentId: string) => {
    const content = answers[assignmentId]?.trim();
    if (!content) return setError('اكتب إجابتك قبل الإرسال.');
    setBusyId(assignmentId); setError('');
    try {
      await apiClient.post(`/assignments/${encodeURIComponent(assignmentId)}/submit`, { content });
      setNotice('تم إرسال الإجابة إلى المعلم وحفظها في سجلك.');
      await load();
    } catch (error) { setError(errorText(error)); }
    finally { setBusyId(''); }
  };

  const createParentLinkCode = async () => {
    setCreatingLinkCode(true);
    setError('');
    try {
      const { data } = await apiClient.post<{ code: string }>('/users/student-link-code');
      setParentLinkCode(data.code);
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setCreatingLinkCode(false);
    }
  };

  return <>
  <AppPage>
    <BrandHeader />
    <View style={styles.pageHeading}><Text style={styles.eyebrow}>مساحة الطالب</Text><Text style={styles.pageTitle}>موادي وواجباتي</Text><Text style={styles.pageSubtitle}>تظهر هنا المواد والواجبات المرتبطة بتسجيلك الفعلي.</Text></View>
    {loading ? <ActivityIndicator color={BRAND.teal} size="large" /> : null}
    {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {notice ? <View style={styles.notice}><Ionicons name="checkmark-circle-outline" size={17} color={BRAND.teal} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
    <View style={styles.stack}><SectionHeading title="المواد المسجلة" />{subjects.length ? subjects.map((subject) => <Surface key={subject.id} style={styles.record}><View style={styles.recordIcon}><Ionicons name="book-outline" size={18} color={BRAND.teal} /></View><View style={styles.recordCopy}><Text style={styles.recordTitle}>{subject.name}</Text><Text style={styles.recordMeta}>{subject.className ?? subject.class?.name ?? 'ضمن تسجيلك الدراسي'}</Text></View></Surface>) : !loading ? <EmptyState title="لا توجد مواد مرتبطة بحسابك" detail="سيتم عرض المواد بعد ربط تسجيلك بفصل دراسي." /> : null}</View>
    <Surface style={styles.parentCodeSurface}><SectionHeading title="ربط حساب ولي الأمر" /><Text style={styles.recordMeta}>أصدر رمزًا لمرة واحدة وشاركه مع ولي أمرك لإكمال الربط والاستبيان.</Text>{parentLinkCode ? <Text selectable style={styles.parentCode}>{parentLinkCode}</Text> : null}<PrimaryButton title={parentLinkCode ? 'إصدار رمز جديد' : 'إصدار رمز ولي الأمر'} icon="link-outline" onPress={() => void createParentLinkCode()} loading={creatingLinkCode} tone="blue" /></Surface>
    <View style={styles.stack}><SectionHeading title="دروس المواد" />{lessons.length ? lessons.map((lesson) => <TouchableOpacity key={lesson.id} activeOpacity={0.82} onPress={() => setSelectedLesson(lesson)}>
      <Surface style={styles.lessonCard}><View style={styles.recordIcon}><Ionicons name="book-outline" size={18} color={BRAND.teal} /></View><View style={styles.recordCopy}><Text style={styles.recordTitle}>{lesson.title}</Text><Text style={styles.recordMeta}>{lesson.subject?.name || 'درس مدرسي'}{lesson.videoUrl ? ' · فيديو' : ''}{lesson.attachments?.length ? ` · ${lesson.attachments.length} مرفقات` : ''}</Text></View><Ionicons name="chevron-back" size={18} color={BRAND.muted} /></Surface>
    </TouchableOpacity>) : !loading ? <EmptyState title="لا توجد دروس منشورة لموادك" detail="ستظهر هنا الدروس التي ينشرها معلموك لفصولك المسجلة." icon="book-outline" /> : null}</View>
    <View style={styles.stack}><SectionHeading title="الواجبات" />{assignments.length ? assignments.map((item) => <Surface key={item.id} style={styles.submission}>
      <View style={styles.recordCopy}><Text style={styles.recordTitle}>{item.title}</Text><Text style={styles.recordMeta}>{typeof item.subject === 'string' ? item.subject : item.subject?.name ?? ''}{item.dueDate ? ` · التسليم ${new Date(item.dueDate).toLocaleDateString('ar-SA')}` : ''}</Text></View>
      {item.status === 'graded' ? <View style={styles.gradeNotice}><Ionicons name="checkmark-circle-outline" size={18} color={BRAND.teal} /><Text style={styles.gradeText}>الدرجة: {item.grade ?? 'تم التصحيح'}</Text></View> : item.status === 'submitted' ? <View style={styles.gradeNotice}><Ionicons name="time-outline" size={18} color={BRAND.amber} /><Text style={styles.pendingText}>تم الإرسال · بانتظار المعلم</Text></View> : <>
        {item.description ? <Text style={styles.answer}>{item.description}</Text> : null}
        <Field label="إجابتك" value={answers[item.id] ?? ''} onChangeText={(value) => setAnswers((current) => ({ ...current, [item.id]: value }))} placeholder="اكتب الإجابة هنا" multiline style={styles.multiline} />
        <PrimaryButton title="إرسال الواجب" icon="send-outline" onPress={() => void submit(item.id)} loading={busyId === item.id} />
      </>}
    </Surface>) : !loading ? <EmptyState title="لا توجد واجبات مسندة حاليًا" detail="عندما يسند المعلم واجبًا لمادتك سيظهر هنا." /> : null}</View>
  </AppPage>
  <Modal visible={Boolean(selectedLesson)} transparent animationType="slide" onRequestClose={() => setSelectedLesson(null)}>
    <View style={styles.modalOverlay}><View style={styles.lessonModal}>
      <View style={styles.modalHeader}><View style={styles.recordCopy}><Text style={styles.recordTitle}>{selectedLesson?.title}</Text><Text style={styles.recordMeta}>{selectedLesson?.subject?.name || 'درس مدرسي'}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق الدرس" onPress={() => setSelectedLesson(null)}><Ionicons name="close-circle-outline" size={26} color={BRAND.muted} /></TouchableOpacity></View>
      <ScrollView style={styles.lessonContent} contentContainerStyle={{ gap: 12 }}><Text selectable style={styles.lessonText}>{selectedLesson?.content?.trim() || 'لا يوجد شرح نصي لهذا الدرس.'}</Text>
        {selectedLesson?.videoUrl ? <PrimaryButton title="فتح فيديو الدرس" icon="play-circle-outline" tone="blue" onPress={() => {
          const url = selectedLesson.videoUrl || '';
          if (!url.startsWith('https://')) return setError('رابط الفيديو غير آمن أو غير صالح.');
          void Linking.openURL(url).catch(() => setError('تعذر فتح فيديو الدرس على هذا الجهاز.'));
        }} /> : null}
        {selectedLesson?.attachments?.map((url, index) => <TouchableOpacity key={`${url}-${index}`} style={styles.attachmentLink} onPress={() => {
          if (!url.startsWith('https://')) return setError('رابط المرفق غير آمن أو غير صالح.');
          void Linking.openURL(url).catch(() => setError('تعذر فتح مرفق الدرس.'));
        }}><Ionicons name="attach-outline" size={18} color={BRAND.blue} /><Text style={styles.attachmentText}>فتح مرفق الدرس {index + 1}</Text></TouchableOpacity>)}
      </ScrollView>
    </View></View>
  </Modal>
  </>;
}

function ParentWorkspace() {
  const [children, setChildren] = useState<Array<{ id: string; name: string; avatar?: string | null; className: string | null; averageGrade: number | null; attendanceRate: number | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get<{ children?: typeof children }>('/dashboard/parent')
      .then(({ data }) => setChildren(data.children ?? []))
      .catch((requestError) => setError(errorText(requestError)))
      .finally(() => setLoading(false));
  }, []);
  return <AppPage>
    <BrandHeader />
    <View style={styles.pageHeading}><Text style={styles.eyebrow}>مساحة ولي الأمر</Text><Text style={styles.pageTitle}>متابعة الأبناء</Text><Text style={styles.pageSubtitle}>بيانات مرتبطة بملفات الأبناء في المدرسة.</Text></View>
    {loading ? <ActivityIndicator color={BRAND.teal} /> : null}{error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {children.length ? children.map((child) => <Surface key={child.id} style={styles.submission}>
      <View style={styles.childIdentity}>{child.avatar ? <Image source={{ uri: child.avatar }} style={styles.childAvatar} /> : <View style={styles.childAvatarFallback}><Ionicons name="person-outline" size={20} color={BRAND.blue} /></View>}
      <View style={styles.recordCopy}><Text style={styles.recordTitle}>{child.name}</Text><Text style={styles.recordMeta}>{child.className ?? 'لا يوجد فصل مسجل'}</Text></View>
      </View>
      <View style={styles.parentMetrics}><Text style={styles.parentMetric}><Text style={styles.parentValue}>{child.averageGrade === null ? '—' : `${Math.round(child.averageGrade)}٪`}</Text>  متوسط الدرجات</Text><Text style={styles.parentMetric}><Text style={styles.parentValue}>{child.attendanceRate === null ? '—' : `${Math.round(child.attendanceRate)}٪`}</Text>  الحضور</Text></View>
    </Surface>) : !loading && !error ? <EmptyState title="لا يوجد طالب مرتبط بهذا الحساب" detail="استخدم رمز الربط الصادر من حساب الطالب، ثم أكمل الاستبيان." icon="people-outline" /> : null}
  </AppPage>;
}

function SchoolWorkspace() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([apiClient.get<SchoolClass[]>('/classes'), apiClient.get<Record<string, number>>('/users/stats')])
      .then(([classResponse, statsResponse]) => { setClasses(classResponse.data); setStats(statsResponse.data); })
      .catch((requestError) => setError(errorText(requestError)))
      .finally(() => setLoading(false));
  }, []);
  return <AppPage>
    <BrandHeader />
    <View style={styles.pageHeading}><Text style={styles.eyebrow}>{user?.role === 'ADMIN' ? 'إدارة المدرسة' : user?.role === 'PRINCIPAL' ? 'مدير المدرسة' : 'وكيل المدرسة'}</Text><Text style={styles.pageTitle}>نظرة المدرسة</Text><Text style={styles.pageSubtitle}>ملخص الفصول والأرقام التي يعيدها الخادم.</Text></View>
    {loading ? <ActivityIndicator color={BRAND.teal} /> : null}{error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {stats ? <Surface>{Object.entries(stats).map(([key, value]) => <View key={key} style={styles.statLine}><Text style={styles.recordTitle}>{Number(value).toLocaleString('ar-SA')}</Text><Text style={styles.recordMeta}>{key}</Text></View>)}</Surface> : null}
    {classes.length ? <View style={styles.stack}><SectionHeading title="فصول المدرسة" />{classes.map((item) => <Surface key={item.id} style={styles.record}><View style={styles.recordIcon}><Ionicons name="people-outline" size={18} color={BRAND.blue} /></View><View style={styles.recordCopy}><Text style={styles.recordTitle}>{item.name}</Text><Text style={styles.recordMeta}>{item._count?.students ?? 0} طالب</Text></View></Surface>)}</View> : !loading && !error ? <EmptyState title="لا توجد فصول مسجلة" detail="الفصول ستظهر هنا بعد تسجيلها من إدارة المدرسة." /> : null}
  </AppPage>;
}

function UnavailableWorkspace() {
  return <AppPage><BrandHeader /><EmptyState title="هذه المساحة غير متاحة لهذا الدور بعد" detail="لم نعرض قائمة تجريبية. ستظهر أدوات الحساب عند نشر مسارات API المخصصة له." /></AppPage>;
}

const styles = StyleSheet.create({
  pageHeading: { alignItems: 'flex-end', gap: 5, marginTop: 8 },
  eyebrow: { color: BRAND.teal, fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  pageTitle: { color: BRAND.ink, fontSize: 23, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  pageSubtitle: { color: BRAND.muted, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  segment: { flexDirection: 'row-reverse', gap: 5, padding: 4, borderRadius: 13, backgroundColor: '#EAF0F2' },
  segmentItem: { flex: 1, minHeight: 41, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10 },
  segmentActive: { backgroundColor: BRAND.ink },
  segmentText: { color: BRAND.muted, fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  segmentTextActive: { color: '#FFFFFF' },
  stack: { gap: 12 },
  fieldLabel: { color: BRAND.ink, fontSize: 13, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  choiceList: { gap: 7 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  record: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 13 },
  lessonCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 13 },
  childIdentity: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  parentCodeSurface: { gap: 11, borderColor: '#BDD5FA', backgroundColor: '#F5F9FF' },
  parentCode: { color: BRAND.ink, fontSize: 19, fontWeight: '900', letterSpacing: 3, textAlign: 'center', paddingVertical: 14, borderWidth: 1, borderColor: '#CADCF7', borderRadius: 10, backgroundColor: '#FFFFFF' },
  childAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF' },
  childAvatarFallback: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: BRAND.blueSoft },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  lessonModal: { maxHeight: '82%', padding: 18, paddingBottom: 30, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF', gap: 15 },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lessonContent: { flexGrow: 0 },
  lessonText: { color: BRAND.ink, fontSize: 15, lineHeight: 25, textAlign: 'right', writingDirection: 'rtl' },
  attachmentLink: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: BRAND.line, borderRadius: 10 },
  attachmentText: { color: BRAND.blue, fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  recordIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: BRAND.tealSoft },
  recordCopy: { flex: 1, gap: 4, alignItems: 'flex-end' },
  recordTitle: { color: BRAND.ink, fontSize: 14, lineHeight: 21, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  recordMeta: { color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  scorePill: { minWidth: 48, alignItems: 'center', gap: 3, padding: 7, borderRadius: 11, backgroundColor: BRAND.tealSoft },
  scoreText: { color: BRAND.teal, fontSize: 16, fontWeight: '900' },
  notice: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, padding: 11, borderRadius: 11, backgroundColor: BRAND.tealSoft },
  noticeText: { flex: 1, color: BRAND.teal, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  studentAttendance: { gap: 8, paddingVertical: 10, borderTopWidth: 1, borderColor: BRAND.line },
  statusRow: { flexDirection: 'row-reverse', gap: 5 },
  statusOption: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.line, borderRadius: 9, backgroundColor: '#FFFFFF' },
  statusSelected: { borderColor: BRAND.teal, backgroundColor: BRAND.tealSoft },
  statusText: { color: BRAND.muted, fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  statusTextSelected: { color: BRAND.teal },
  submission: { gap: 11 },
  answer: { color: BRAND.ink, fontSize: 14, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl', padding: 12, borderRadius: 10, backgroundColor: '#F6F8F9' },
  actions: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  aiAction: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 48, paddingHorizontal: 10, borderWidth: 1, borderColor: '#BFD1FF', borderRadius: 11, backgroundColor: BRAND.blueSoft },
  aiActionText: { color: BRAND.blue, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  disabled: { opacity: 0.45 },
  gradeNotice: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, padding: 10, borderRadius: 10, backgroundColor: BRAND.tealSoft },
  gradeText: { color: BRAND.teal, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  pendingText: { color: BRAND.amber, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  difficulties: { flexDirection: 'row-reverse', gap: 7 },
  difficulty: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.line, borderRadius: 10 },
  difficultyActive: { borderColor: BRAND.blue, backgroundColor: BRAND.blueSoft },
  difficultyText: { color: BRAND.muted, fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  difficultyTextActive: { color: BRAND.blue },
  aiDisclaimer: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 7, padding: 11, borderRadius: 10, backgroundColor: BRAND.amberSoft },
  aiDisclaimerText: { flex: 1, color: BRAND.amber, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  questionCard: { gap: 9 },
  questionNumber: { color: BRAND.blue, fontSize: 12, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  questionOption: { color: BRAND.ink, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  parentMetrics: { gap: 7, paddingTop: 8, borderTopWidth: 1, borderColor: BRAND.line },
  parentMetric: { color: BRAND.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  parentValue: { color: BRAND.teal, fontWeight: '900' },
  statLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderColor: BRAND.line },
});
