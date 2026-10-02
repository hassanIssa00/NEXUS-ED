'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, ChevronLeft, ChevronRight, CircleHelp, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

type AssessmentAttempt = {
  id: string;
  studentId: string;
  studentName: string;
  gradeLevel: number;
  assessmentKey: string;
  score: number;
  correctCount: number;
  questionCount: number;
  completedAt: string;
};

type AssessmentReport = AssessmentAttempt & {
  answers: Array<{
    id: string;
    category: string;
    prompt: string;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }>;
};

function messageFrom(error: any) {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر تحميل التقارير.';
}

function gradeName(level: number) {
  if (level === 0) return 'رياض الأطفال';
  if (level >= 1 && level <= 6) return `الصف ${level} الابتدائي`;
  if (level >= 7 && level <= 9) return `الصف ${level - 6} المتوسط`;
  return `الصف ${level - 9} الثانوي`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function PlacementAssessmentReports() {
  const [items, setItems] = useState<AssessmentAttempt[]>([]);
  const [selected, setSelected] = useState<AssessmentReport | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 25;

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.get('/assessments/placement/reports', { params: { page, limit } })
      .then(({ data }) => {
        if (!active) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setError('');
      })
      .catch((requestError) => { if (active) setError(messageFrom(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const openReport = async (id: string) => {
    setDetailLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get(`/assessments/placement/reports/${encodeURIComponent(id)}`);
      setSelected(data);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 py-7 md:p-8" dir="rtl">
      <header className="flex flex-wrap items-start gap-3 border-b pb-5">
        <BarChart3 className="mt-1 h-6 w-6 text-teal-700 dark:text-teal-300" />
        <div>
          <h1 className="text-xl font-bold text-foreground">تقارير الاختبارات التشخيصية</h1>
          <p className="mt-1 text-sm text-muted-foreground">نتائج محفوظة في ملفات الطلاب ضمن نطاق صلاحيات حسابك.</p>
        </div>
        <span className="me-auto text-sm tabular-nums text-muted-foreground">{total} تقرير</span>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      <section aria-label="قائمة نتائج الاختبارات">
        <div className="hidden grid-cols-[minmax(12rem,1.4fr)_1fr_1fr_1fr_2fr_auto] gap-4 border-b px-3 py-2 text-xs font-bold text-muted-foreground md:grid">
          <span>الطالب</span><span>الصف</span><span>الدرجة</span><span>الإجابات</span><span>تاريخ الإكمال</span><span />
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><LoaderCircle className="h-6 w-6 animate-spin text-teal-700" aria-label="جارٍ تحميل التقارير" /></div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 py-12 text-sm text-muted-foreground"><CircleHelp className="h-5 w-5" />لا توجد نتائج اختبارات محفوظة ضمن نطاق صلاحياتك.</div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="grid gap-2 px-3 py-4 text-sm md:grid-cols-[minmax(12rem,1.4fr)_1fr_1fr_1fr_2fr_auto] md:items-center md:gap-4">
                <span className="font-semibold text-foreground">{item.studentName}</span>
                <span className="text-muted-foreground">{gradeName(item.gradeLevel)}</span>
                <span className="font-bold tabular-nums text-foreground">{item.score}%</span>
                <span className="tabular-nums text-muted-foreground">{item.correctCount} / {item.questionCount}</span>
                <time className="text-xs text-muted-foreground" dateTime={item.completedAt}>{formatDate(item.completedAt)}</time>
                <Button variant="outline" size="sm" onClick={() => openReport(item.id)} disabled={detailLoading}>
                  {detailLoading ? <LoaderCircle className="ms-2 h-4 w-4 animate-spin" /> : null}عرض التقرير
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">صفحة {page} من {Math.max(1, Math.ceil(total / limit))}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" aria-label="الصفحة السابقة" title="الصفحة السابقة" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" aria-label="الصفحة التالية" title="الصفحة التالية" onClick={() => setPage((value) => value + 1)} disabled={page >= Math.ceil(total / limit) || loading}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      {selected && (
        <section className="space-y-5 border-t pt-6" aria-labelledby="report-detail-title">
          <header className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 id="report-detail-title" className="text-lg font-bold text-foreground">{selected.studentName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{gradeName(selected.gradeLevel)} · {selected.correctCount} من {selected.questionCount} إجابة صحيحة · {selected.score}%</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>إغلاق التقرير</Button>
          </header>
          <ol className="divide-y border-y">
            {selected.answers.map((answer, index) => (
              <li key={answer.id} className="grid gap-2 py-4 md:grid-cols-[2rem_1fr]">
                <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">{answer.category}</p>
                  <p className="text-sm font-semibold leading-6 text-foreground">{answer.prompt}</p>
                  <p className="text-sm leading-6 text-muted-foreground">إجابة الطالب: <span className={answer.isCorrect ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-rose-700 dark:text-rose-300'}>{answer.selectedAnswer ?? 'لا توجد إجابة محفوظة'}</span></p>
                  {!answer.isCorrect && <p className="text-sm leading-6 text-muted-foreground">الإجابة الصحيحة: <span className="font-semibold text-foreground">{answer.correctAnswer}</span></p>}
                  <p className="text-xs leading-5 text-muted-foreground">{answer.explanation}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
