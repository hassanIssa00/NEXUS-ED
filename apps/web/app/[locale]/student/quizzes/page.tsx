'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { ClipboardList } from 'lucide-react';

type Quiz = { id: string; title: string; instructions?: string; dueAt?: string | null; questionCount: number; class: { name: string }; subject: { name: string }; attempts: Array<{ id: string; score: number | null; maxScore: number | null; submittedAt: string }> };

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await apiClient.get<Quiz[]>('/workspace/student/quizzes'); setQuizzes(response.data || []); }
    catch (caught: any) { setError(caught?.response?.data?.message || 'تعذر تحميل الاختبارات'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <main dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <header className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-teal-700" /><div><h1 className="text-2xl font-bold">اختباراتي</h1><p className="mt-1 text-sm text-muted-foreground">الاختبارات المنشورة لفصولك وموادك.</p></div></header>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">جاري تحميل الاختبارات...</p> : quizzes.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد اختبارات منشورة حاليًا.</p> : <div className="divide-y rounded-md border bg-card">{quizzes.map((quiz) => {
      const attempt = quiz.attempts[0];
      return <article key={quiz.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><h2 className="font-semibold">{quiz.title}</h2><p className="mt-1 text-sm text-muted-foreground">{quiz.class?.name} · {quiz.subject?.name} · {quiz.questionCount} سؤال</p><p className="mt-1 text-xs text-muted-foreground">{quiz.dueAt ? `آخر موعد: ${new Date(quiz.dueAt).toLocaleString('ar-EG')}` : 'لا يوجد موعد إغلاق'}</p>{attempt && <p className="mt-1 text-sm font-medium text-emerald-700">تم التسليم{attempt.score !== null ? ` · الدرجة ${attempt.score}/${attempt.maxScore}` : ''}</p>}</div><Link href={`/student/quizzes/${quiz.id}`} className="inline-flex h-10 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white">{attempt ? 'عرض التسليم' : 'بدء الاختبار'}</Link></article>;
    })}</div>}
  </main>;
}
