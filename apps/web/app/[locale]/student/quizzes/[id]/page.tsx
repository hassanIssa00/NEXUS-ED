'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { ArrowRight, ClipboardList } from 'lucide-react';

type Question = { id: string; prompt: string; type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'; points: number; options?: string[] };
type Quiz = { id: string; title: string; instructions?: string; dueAt?: string | null; questions: Question[]; showResults: boolean; attempt?: { id: string; score: number | null; maxScore: number | null; submittedAt: string } | null };

export default function StudentQuizPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true); setError('');
    try {
      const response = await apiClient.get<Quiz>(`/workspace/student/quizzes/${params.id}`);
      setQuiz(response.data);
    } catch (caught: any) { setError(caught?.response?.data?.message || 'تعذر فتح الاختبار'); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quiz || quiz.attempt) return;
    if (!window.confirm('بعد التسليم لن تتمكن من تعديل الإجابات. هل تريد التسليم؟')) return;
    setBusy(true); setError('');
    try {
      await apiClient.post(`/workspace/student/quizzes/${quiz.id}/attempts`, { answers });
      await load();
    } catch (caught: any) { setError(caught?.response?.data?.message || 'تعذر تسليم الإجابات'); }
    finally { setBusy(false); }
  };

  if (loading) return <main className="p-8 text-center text-sm text-muted-foreground">جاري تحميل الاختبار...</main>;
  if (error && !quiz) return <main dir="rtl" className="mx-auto max-w-3xl space-y-4 p-6"><p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p><button onClick={() => router.back()} className="h-10 rounded-md border px-4">رجوع</button></main>;
  if (!quiz) return null;

  return <main dir="rtl" className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
    <button onClick={() => router.push('/student/quizzes')} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><ArrowRight className="h-4 w-4" />الاختبارات</button>
    <header className="rounded-md border bg-card p-5"><div className="flex items-center gap-3"><ClipboardList className="h-6 w-6 text-teal-700" /><div><h1 className="text-xl font-bold">{quiz.title}</h1><p className="mt-1 text-sm text-muted-foreground">{quiz.questions.length} سؤال · {quiz.questions.reduce((total, question) => total + question.points, 0)} درجة</p></div></div>{quiz.instructions && <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{quiz.instructions}</p>}{quiz.dueAt && <p className="mt-3 text-xs text-muted-foreground">آخر موعد: {new Date(quiz.dueAt).toLocaleString('ar-EG')}</p>}</header>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {quiz.attempt && <section role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">تم تسليم إجاباتك في {new Date(quiz.attempt.submittedAt).toLocaleString('ar-EG')}.{quiz.showResults && quiz.attempt.score !== null ? ` الدرجة: ${quiz.attempt.score}/${quiz.attempt.maxScore}.` : ' ستظهر النتيجة بعد إتاحتها أو تصحيحها.'}</section>}
    <form onSubmit={submit} className="space-y-4">{quiz.questions.map((question, index) => <fieldset key={question.id} disabled={Boolean(quiz.attempt)} className="space-y-3 rounded-md border bg-card p-4"><legend className="font-semibold">{index + 1}. {question.prompt} <span className="text-xs font-normal text-muted-foreground">({question.points} درجة)</span></legend>
      {question.type === 'multiple_choice' && (question.options || []).map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm"><input type="radio" name={question.id} checked={answers[question.id] === String(optionIndex)} onChange={() => setAnswers((current) => ({ ...current, [question.id]: String(optionIndex) }))} />{option}</label>)}
      {question.type === 'true_false' && <div className="flex gap-4">{[{ value: 'true', label: 'صح' }, { value: 'false', label: 'خطأ' }].map((option) => <label key={option.value} className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm"><input type="radio" name={question.id} checked={answers[question.id] === option.value} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))} />{option.label}</label>)}</div>}
      {question.type === 'short_answer' && <input value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={5000} className="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="اكتب الإجابة" />}
      {question.type === 'essay' && <textarea value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={5000} rows={5} className="w-full rounded-md border bg-background p-3 text-sm" placeholder="اكتب إجابتك" />}
    </fieldset>)}
      {!quiz.attempt && <button disabled={busy} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? 'جارٍ التسليم...' : 'تسليم الاختبار'}</button>}
    </form>
  </main>;
}
