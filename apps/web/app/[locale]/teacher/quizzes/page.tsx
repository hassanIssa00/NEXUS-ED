'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AlertCircle, ClipboardList, Eye, EyeOff, Plus, RefreshCw, Trash2 } from 'lucide-react';

type Question = {
  id: string;
  prompt: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  points: number;
  options: Array<{ text: string; correct: boolean }>;
  correctAnswer: string;
};
type ClassItem = { id: string; name: string; subjects: Array<{ id: string; name: string }> };
type Quiz = { id: string; title: string; published: boolean; dueAt?: string | null; class: { name: string }; subject: { name: string }; _count: { attempts: number } };
type Attempt = { id: string; score: number | null; maxScore: number; feedback?: string; submittedAt: string; answers: Record<string, string>; student: { name?: string; email: string } };

const blankQuestion = (): Question => ({ id: `q${Date.now()}`, prompt: '', type: 'multiple_choice', points: 1, options: [{ text: '', correct: true }, { text: '', correct: false }], correctAnswer: '' });

function errorMessage(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || error?.message || 'تعذر إتمام الطلب';
}

export default function TeacherQuizzesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [questions, setQuestions] = useState<Question[]>([blankQuestion()]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [classResponse, quizResponse] = await Promise.all([
        apiClient.get<ClassItem[]>('/workspace/teacher/classes'),
        apiClient.get<Quiz[]>('/workspace/teacher/quizzes'),
      ]);
      setClasses(classResponse.data || []);
      setQuizzes(quizResponse.data || []);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post('/workspace/teacher/quizzes', {
        title, classId, subjectId, instructions,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        questions,
      });
      setSuccess(`تم حفظ الاختبار «${response.data.title}» كمسودة.`);
      setTitle(''); setInstructions(''); setDueAt(''); setQuestions([blankQuestion()]);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (quiz: Quiz) => {
    try {
      setError('');
      await apiClient.patch(`/workspace/teacher/quizzes/${quiz.id}/publish`, { published: !quiz.published });
      await load();
    } catch (caught) { setError(errorMessage(caught)); }
  };

  const openAttempts = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    try {
      const response = await apiClient.get<Attempt[]>(`/workspace/teacher/quizzes/${quiz.id}/attempts`);
      setAttempts(response.data || []);
      setScores(Object.fromEntries((response.data || []).map((item) => [item.id, item.score?.toString() || ''])));
    } catch (caught) { setError(errorMessage(caught)); }
  };

  const gradeAttempt = async (attempt: Attempt) => {
    try {
      await apiClient.patch(`/workspace/teacher/quizzes/${selectedQuiz?.id}/attempts/${attempt.id}/grade`, { score: Number(scores[attempt.id]), feedback: attempt.feedback || '' });
      setSuccess(`تم حفظ درجة ${attempt.student.name || attempt.student.email}.`);
      if (selectedQuiz) await openAttempts(selectedQuiz);
    } catch (caught) { setError(errorMessage(caught)); }
  };

  const deleteQuiz = async (quiz: Quiz) => {
    if (!window.confirm(`حذف الاختبار «${quiz.title}» وتسليماته؟`)) return;
    try { await apiClient.delete(`/workspace/teacher/quizzes/${quiz.id}`); await load(); }
    catch (caught) { setError(errorMessage(caught)); }
  };

  const selectedClass = classes.find((item) => item.id === classId);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">الاختبارات</h1><p className="mt-1 text-sm text-muted-foreground">إنشاء الاختبارات، نشرها، ومراجعة تسليمات طلاب فصولك.</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm" aria-label="تحديث"><RefreshCw className="h-4 w-4" /> تحديث</button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">اختباراتي</h2><span className="text-sm text-muted-foreground">{quizzes.length} اختبار</span></div>
          {loading ? <p className="py-10 text-center text-sm text-muted-foreground">جاري تحميل الاختبارات...</p> : quizzes.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد اختبارات محفوظة حتى الآن.</p> : quizzes.map((quiz) => (
            <article key={quiz.id} className="flex flex-col gap-4 rounded-md border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><h3 className="truncate font-semibold">{quiz.title}</h3><p className="mt-1 text-sm text-muted-foreground">{quiz.class?.name} · {quiz.subject?.name} · {quiz._count?.attempts || 0} تسليم</p><p className="mt-1 text-xs text-muted-foreground">{quiz.dueAt ? `الموعد: ${new Date(quiz.dueAt).toLocaleString('ar-EG')}` : 'بدون موعد نهائي'}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-sm px-2 py-1 text-xs ${quiz.published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{quiz.published ? 'منشور' : 'مسودة'}</span>
                <button type="button" onClick={() => void openAttempts(quiz)} className="h-9 rounded-md border px-3 text-sm">التسليمات</button>
                <button type="button" onClick={() => void togglePublish(quiz)} className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm" aria-label={quiz.published ? 'إلغاء النشر' : 'نشر'}>{quiz.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{quiz.published ? 'إيقاف' : 'نشر'}</button>
                <button type="button" onClick={() => void deleteQuiz(quiz)} className="grid size-9 place-items-center rounded-md border text-red-700" aria-label="حذف الاختبار"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-md border bg-card p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-teal-700" /><h2 className="text-lg font-semibold">إنشاء اختبار</h2></div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1 text-sm"><span className="font-medium">العنوان</span><input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm"><span className="font-medium">الفصل</span><select required value={classId} onChange={(event) => { setClassId(event.target.value); setSubjectId(''); }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">اختر فصلاً</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="block space-y-1 text-sm"><span className="font-medium">المادة</span><select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">اختر مادة</option>{(selectedClass?.subjects || []).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            </div>
            <label className="block space-y-1 text-sm"><span className="font-medium">التعليمات</span><textarea rows={2} maxLength={2000} value={instructions} onChange={(event) => setInstructions(event.target.value)} className="w-full rounded-md border bg-background p-3" /></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">موعد الإغلاق</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="font-semibold">الأسئلة</h3><button type="button" onClick={() => setQuestions((current) => [...current, blankQuestion()])} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><Plus className="h-4 w-4" /> سؤال</button></div>
              {questions.map((question, index) => <div key={question.id} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">سؤال {index + 1}</span>{questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} className="grid size-8 place-items-center rounded border text-red-700" aria-label="حذف السؤال"><Trash2 className="h-4 w-4" /></button>}</div>
                <textarea required value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} placeholder="اكتب نص السؤال" rows={2} className="w-full rounded-md border bg-background p-2 text-sm" />
                <div className="grid gap-2 sm:grid-cols-[1fr_90px]"><select value={question.type} onChange={(event) => updateQuestion(question.id, { type: event.target.value as Question['type'] })} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="multiple_choice">اختيار من متعدد</option><option value="true_false">صح أو خطأ</option><option value="short_answer">إجابة قصيرة</option><option value="essay">مقالي</option></select><input type="number" min={1} max={100} step="any" required value={question.points} onChange={(event) => updateQuestion(question.id, { points: Number(event.target.value) })} aria-label="درجة السؤال" className="h-9 rounded-md border bg-background px-2 text-sm" /></div>
                {question.type === 'multiple_choice' && <div className="space-y-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-2"><input value={option.text} required onChange={(event) => updateQuestion(question.id, { options: question.options.map((item, i) => i === optionIndex ? { ...item, text: event.target.value } : item) })} placeholder={`الخيار ${optionIndex + 1}`} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" /><label className="flex items-center gap-1 text-xs"><input type="radio" name={`correct-${question.id}`} checked={option.correct} onChange={() => updateQuestion(question.id, { options: question.options.map((item, i) => ({ ...item, correct: i === optionIndex })) })} />صحيح</label>{question.options.length > 2 && <button type="button" onClick={() => updateQuestion(question.id, { options: question.options.filter((_, i) => i !== optionIndex) })} className="grid size-8 place-items-center rounded border" aria-label="حذف الخيار"><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}{question.options.length < 8 && <button type="button" onClick={() => updateQuestion(question.id, { options: [...question.options, { text: '', correct: false }] })} className="text-xs font-medium text-teal-700">إضافة خيار</button>}</div>}
                {question.type === 'true_false' && <label className="block space-y-1 text-sm"><span>الإجابة الصحيحة</span><select value={question.correctAnswer} onChange={(event) => updateQuestion(question.id, { correctAnswer: event.target.value })} className="h-9 w-full rounded-md border bg-background px-2"><option value="">اختر الإجابة</option><option value="true">صح</option><option value="false">خطأ</option></select></label>}
                {question.type === 'short_answer' && <label className="block space-y-1 text-sm"><span>الإجابة الصحيحة</span><input required value={question.correctAnswer} onChange={(event) => updateQuestion(question.id, { correctAnswer: event.target.value })} className="h-9 w-full rounded-md border bg-background px-2" /></label>}
                {question.type === 'essay' && <p className="text-xs text-muted-foreground">سيظهر هذا السؤال للمعلم ضمن التسليمات لتصحيحه يدويًا.</p>}
              </div>)}
            </div>
            <button disabled={busy || !classes.length} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}</button>
            {!classes.length && !loading && <p className="text-xs text-amber-700">لا توجد فصول مسندة إلى حسابك.</p>}
          </form>
        </section>
      </div>

      {selectedQuiz && <section className="space-y-3 rounded-md border bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">تسليمات: {selectedQuiz.title}</h2><p className="text-sm text-muted-foreground">الإجابات المقالية تحتاج إلى درجة يحددها المعلم.</p></div><button onClick={() => setSelectedQuiz(null)} className="h-9 rounded-md border px-3 text-sm">إغلاق</button></div>
        {!attempts.length ? <p className="py-5 text-center text-sm text-muted-foreground">لا توجد تسليمات.</p> : attempts.map((attempt) => <article key={attempt.id} className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{attempt.student.name || attempt.student.email}</p><p className="text-xs text-muted-foreground">{new Date(attempt.submittedAt).toLocaleString('ar-EG')}</p></div><div className="flex items-center gap-2"><input type="number" min={0} max={attempt.maxScore} step="any" value={scores[attempt.id] ?? ''} onChange={(event) => setScores((current) => ({ ...current, [attempt.id]: event.target.value }))} aria-label="الدرجة" className="h-9 w-24 rounded-md border bg-background px-2" /><span className="text-sm">/ {attempt.maxScore}</span><button onClick={() => void gradeAttempt(attempt)} className="h-9 rounded-md bg-teal-700 px-3 text-sm font-medium text-white">حفظ الدرجة</button></div></div>
          <div className="grid gap-2 md:grid-cols-2">{Object.entries(attempt.answers || {}).map(([questionId, answer]) => <p key={questionId} className="rounded bg-muted/40 p-2 text-sm"><span className="font-medium">{questionId}: </span>{answer}</p>)}</div>
        </article>)}
      </section>}
    </main>
  );
}
