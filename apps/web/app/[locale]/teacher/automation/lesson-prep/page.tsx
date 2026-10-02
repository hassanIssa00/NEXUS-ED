'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, BookOpenCheck, BrainCircuit, Loader2, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Lesson = {
  id: string;
  title: string;
  content?: string | null;
  subject?: { name?: string | null } | null;
  createdAt?: string;
};

type LessonSummary = {
  title: string;
  keyPoints: string[];
  concepts: string[];
  practiceQuestions: Array<{ question: string; options: string[]; correctAnswer: number; explanation: string }>;
};

function messageFrom(error: any) {
  return error?.response?.data?.message || 'تعذر تحميل البيانات من الخادم.';
}

export default function LessonPrepAutomation() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/lessons/my')
      .then(({ data }) => { if (active) setLessons(Array.isArray(data) ? data : []); })
      .catch((reason) => { if (active) setError(messageFrom(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const generateSummary = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setError('');
    setSummary(null);
    try {
      const { data } = await apiClient.post(`/ai/lesson-summary/${selectedId}`);
      setSummary(data);
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setGenerating(false);
    }
  };

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedId);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10" dir="rtl">
      <header>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpenCheck className="h-5 w-5" /></span>
          <h1 className="text-2xl font-bold text-foreground">مساعد تحضير الدروس</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">اختر درسًا محفوظًا لديك لإنشاء ملخص وأسئلة من محتواه الفعلي.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">دروسك المحفوظة</CardTitle>
          <CardDescription>لا يتم إنشاء درس أو منهج تلقائيًا من بيانات تجريبية.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">تحميل الدروس...</p> : lessons.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد دروس محفوظة مرتبطة بحسابك حتى الآن.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setSummary(null); }} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">اختر درسًا</option>
                {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}{lesson.subject?.name ? ` · ${lesson.subject.name}` : ''}</option>)}
              </select>
              <Button onClick={generateSummary} disabled={!selectedId || !selectedLesson?.content?.trim() || generating}>
                {generating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
                إنشاء ملخص وأسئلة
              </Button>
            </div>
          )}
          {selectedLesson && !selectedLesson.content?.trim() && <p className="text-sm text-amber-700">هذا الدرس لا يحتوي على نص يمكن تحليله.</p>}
          {error && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        </CardContent>
      </Card>

      {summary && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="h-4 w-4 text-primary" />{summary.title}</CardTitle></CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <section>
                <h2 className="mb-2 text-sm font-semibold">النقاط الرئيسية</h2>
                {summary.keyPoints.length ? <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">{summary.keyPoints.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">لم ينتج الملخص نقاطًا.</p>}
              </section>
              <section>
                <h2 className="mb-2 text-sm font-semibold">المفاهيم</h2>
                {summary.concepts.length ? <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">{summary.concepts.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">لم ينتج الملخص مفاهيم.</p>}
              </section>
            </CardContent>
          </Card>
          {summary.practiceQuestions.map((item, index) => (
            <Card key={`${index}-${item.question}`}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{index + 1}. {item.question}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {item.options.map((option, optionIndex) => <p key={`${optionIndex}-${option}`} className={optionIndex === item.correctAnswer ? 'font-medium text-emerald-700' : 'text-muted-foreground'}>{optionIndex + 1}. {option}</p>)}
                {item.explanation && <p className="border-t pt-2 text-muted-foreground">{item.explanation}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
