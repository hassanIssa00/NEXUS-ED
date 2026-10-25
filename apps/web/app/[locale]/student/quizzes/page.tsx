'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { apiClient } from '@/lib/api/client';
import { ClipboardList } from 'lucide-react';
import { useLocale } from 'next-intl';

type Quiz = { id: string; title: string; instructions?: string; dueAt?: string | null; questionCount: number; class: { name: string }; subject: { name: string }; attempts: Array<{ id: string; score: number | null; maxScore: number | null; submittedAt: string }> };

export default function StudentQuizzesPage() {
  const isEnglish = useLocale() === 'en';
  const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await apiClient.get<Quiz[]>('/workspace/student/quizzes'); setQuizzes(response.data || []); }
    catch { setError(t('تعذر تحميل الاختبارات', 'Could not load quizzes')); }
    finally { setLoading(false); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  return <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <header className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-teal-700" /><div><h1 className="text-2xl font-bold">{t('اختباراتي', 'My quizzes')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('الاختبارات المنشورة لفصولك وموادك.', 'Quizzes published for your classes and subjects.')}</p></div></header>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">{t('جاري تحميل الاختبارات...', 'Loading quizzes…')}</p> : quizzes.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{t('لا توجد اختبارات منشورة حاليًا.', 'No quizzes have been published yet.')}</p> : <div className="divide-y rounded-md border bg-card">{quizzes.map((quiz) => {
      const attempt = quiz.attempts[0];
      return <article key={quiz.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><h2 className="font-semibold">{quiz.title}</h2><p className="mt-1 text-sm text-muted-foreground">{quiz.class?.name} · {quiz.subject?.name} · {quiz.questionCount} {t('سؤال', 'questions')}</p><p className="mt-1 text-xs text-muted-foreground">{quiz.dueAt ? `${t('آخر موعد:', 'Due:')} ${new Date(quiz.dueAt).toLocaleString(isEnglish ? 'en-US' : 'ar-EG')}` : t('لا يوجد موعد إغلاق', 'No closing date')}</p>{attempt && <p className="mt-1 text-sm font-medium text-emerald-700">{t('تم التسليم', 'Submitted')}{attempt.score !== null ? ` · ${t('الدرجة', 'Score')} ${attempt.score}/${attempt.maxScore}` : ''}</p>}</div><Link href={`/student/quizzes/${quiz.id}`} className="inline-flex h-10 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white">{attempt ? t('عرض التسليم', 'View submission') : t('بدء الاختبار', 'Start quiz')}</Link></article>;
    })}</div>}
  </main>;
}
