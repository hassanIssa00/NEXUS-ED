'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter as useLocaleRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { ArrowRight, ClipboardList } from 'lucide-react';

type Question = { id: string; prompt: string; type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'; points: number; options?: string[] };
type Quiz = { id: string; title: string; instructions?: string; dueAt?: string | null; questions: Question[]; showResults: boolean; attempt?: { id: string; score: number | null; maxScore: number | null; submittedAt: string } | null };

export default function StudentQuizPage() {
  const params = useParams<{ id: string }>();
  const router = useLocaleRouter();
  const isEnglish = useLocale() === 'en';
  const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish]);
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
    } catch { setError(t('تعذر فتح الاختبار', 'Could not open the quiz')); }
    finally { setLoading(false); }
  }, [params.id, t]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quiz || quiz.attempt) return;
    if (!window.confirm(t('بعد التسليم لن تتمكن من تعديل الإجابات. هل تريد التسليم؟', 'You will not be able to change your answers after submitting. Continue?'))) return;
    setBusy(true); setError('');
    try {
      await apiClient.post(`/workspace/student/quizzes/${quiz.id}/attempts`, { answers });
      await load();
    } catch { setError(t('تعذر تسليم الإجابات', 'Could not submit your answers')); }
    finally { setBusy(false); }
  };

  if (loading) return <main dir={isEnglish ? 'ltr' : 'rtl'} className="p-8 text-center text-sm text-muted-foreground">{t('جاري تحميل الاختبار...', 'Loading quiz…')}</main>;
  if (error && !quiz) return <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-3xl space-y-4 p-6"><p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p><button onClick={() => router.back()} className="h-10 rounded-md border px-4">{t('رجوع', 'Back')}</button></main>;
  if (!quiz) return null;

  return <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
    <button onClick={() => router.push('/student/quizzes')} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><ArrowRight className="h-4 w-4" />{t('الاختبارات', 'Quizzes')}</button>
    <header className="rounded-md border bg-card p-5"><div className="flex items-center gap-3"><ClipboardList className="h-6 w-6 text-teal-700" /><div><h1 className="text-xl font-bold">{quiz.title}</h1><p className="mt-1 text-sm text-muted-foreground">{quiz.questions.length} {t('سؤال', 'questions')} · {quiz.questions.reduce((total, question) => total + question.points, 0)} {t('درجة', 'points')}</p></div></div>{quiz.instructions && <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{quiz.instructions}</p>}{quiz.dueAt && <p className="mt-3 text-xs text-muted-foreground">{t('آخر موعد:', 'Due:')} {new Date(quiz.dueAt).toLocaleString(isEnglish ? 'en-US' : 'ar-EG')}</p>}</header>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {quiz.attempt && <section role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{t('تم تسليم إجاباتك في', 'Your answers were submitted on')} {new Date(quiz.attempt.submittedAt).toLocaleString(isEnglish ? 'en-US' : 'ar-EG')}.{quiz.showResults && quiz.attempt.score !== null ? ` ${t('الدرجة:', 'Score:')} ${quiz.attempt.score}/${quiz.attempt.maxScore}.` : t(' ستظهر النتيجة بعد إتاحتها أو تصحيحها.', ' The results will appear when released or graded.')}</section>}
    <form onSubmit={submit} className="space-y-4">{quiz.questions.map((question, index) => <fieldset key={question.id} disabled={Boolean(quiz.attempt)} className="space-y-3 rounded-md border bg-card p-4"><legend className="font-semibold">{index + 1}. {question.prompt} <span className="text-xs font-normal text-muted-foreground">({question.points} {t('درجة', 'points')})</span></legend>
      {question.type === 'multiple_choice' && (question.options || []).map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm"><input type="radio" name={question.id} checked={answers[question.id] === String(optionIndex)} onChange={() => setAnswers((current) => ({ ...current, [question.id]: String(optionIndex) }))} />{option}</label>)}
      {question.type === 'true_false' && <div className="flex gap-4">{[{ value: 'true', label: t('صح', 'True') }, { value: 'false', label: t('خطأ', 'False') }].map((option) => <label key={option.value} className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm"><input type="radio" name={question.id} checked={answers[question.id] === option.value} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))} />{option.label}</label>)}</div>}
      {question.type === 'short_answer' && <input value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={5000} className="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder={t('اكتب الإجابة', 'Enter your answer')} />}
      {question.type === 'essay' && <textarea value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={5000} rows={5} className="w-full rounded-md border bg-background p-3 text-sm" placeholder={t('اكتب إجابتك', 'Write your answer')} />}
    </fieldset>)}
      {!quiz.attempt && <button disabled={busy} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? t('جارٍ التسليم...', 'Submitting…') : t('تسليم الاختبار', 'Submit quiz')}</button>}
    </form>
  </main>;
}
