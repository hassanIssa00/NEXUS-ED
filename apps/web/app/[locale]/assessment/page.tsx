'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';
import { Circle, Minus, Square, Triangle } from 'lucide-react';

type AssessmentQuestion = {
  id: string;
  categoryLabel: string;
  prompt: string;
  visual: string;
  options: string[];
};

type AssessmentState = {
  gradeLevel: number;
  foundationalForGradeOne: boolean;
  assessment: {
    key: string;
    title: string;
    subtitle: string;
    subjects: string[];
    questions: AssessmentQuestion[];
  };
  attempt: {
    id: string;
    score: number;
    correctCount: number;
    questionCount: number;
    completedAt: string;
  } | null;
};

const shapeGlyphs = new Set(['△', '▲', '▽', '▼', '○', '◯', '●', '□', '■', '—', '―', '−']);

function ShapeSequence({ value, size }: { value: string; size: 'large' | 'option' }) {
  const glyphs = [...value.trim()];
  if (!glyphs.length || !glyphs.every((glyph) => shapeGlyphs.has(glyph))) {
    return <span className={size === 'large' ? 'text-center text-2xl font-semibold text-foreground' : 'text-foreground'}>{value}</span>;
  }
  const iconSize = size === 'large' ? 72 : 48;
  const className = size === 'large' ? 'text-teal-700 dark:text-teal-300' : 'text-foreground';

  return (
    <span className="flex items-center justify-center gap-4" aria-hidden="true">
      {glyphs.map((glyph, index) => {
        const iconProps = { size: iconSize, strokeWidth: 2.5, className: `${className} ${'▽▼'.includes(glyph) ? 'rotate-180' : ''}` };
        if ('△▲▽▼'.includes(glyph)) return <Triangle key={`${glyph}-${index}`} {...iconProps} fill={glyph === '▲' || glyph === '▼' ? 'currentColor' : 'none'} />;
        if ('○◯●'.includes(glyph)) return <Circle key={`${glyph}-${index}`} {...iconProps} fill={glyph === '●' ? 'currentColor' : 'none'} />;
        if ('□■'.includes(glyph)) return <Square key={`${glyph}-${index}`} {...iconProps} fill={glyph === '■' ? 'currentColor' : 'none'} />;
        return <Minus key={`${glyph}-${index}`} {...iconProps} />;
      })}
    </span>
  );
}

function getErrorMessage(error: any) {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر تحميل الاختبار. حاول مرة أخرى.';
}

export default function AssessmentPage() {
  const { refreshProfile } = useAuth();
  const [data, setData] = useState<AssessmentState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/assessments/placement/current')
      .then(({ data: result }) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const questions = data?.assessment.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const completed = questions.length > 0 && questions.every((question) => Boolean(answers[question.id]));

  const submit = async () => {
    if (!completed || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const { data: attempt } = await apiClient.post('/assessments/placement/submit', { answers });
      setData((previous) => previous ? { ...previous, attempt } : previous);
      await refreshProfile();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="grid min-h-[60vh] place-items-center" dir="rtl"><LoaderCircle className="h-7 w-7 animate-spin text-teal-700" aria-label="جارٍ تحميل الاختبار" /></main>;
  }

  if (error && !data) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6" dir="rtl">
        <section className="w-full space-y-4 rounded-md border bg-card p-6 text-center">
          <AlertCircle className="mx-auto h-9 w-9 text-rose-600" />
          <h1 className="text-xl font-bold text-foreground">تعذر فتح الاختبار</h1>
          <p role="alert" className="text-sm leading-6 text-muted-foreground">{error}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>إعادة المحاولة</Button>
            <Button asChild><Link href="/student/new">فتح ملف الطالب</Link></Button>
          </div>
        </section>
      </main>
    );
  }

  if (!data) return null;

  if (data.attempt) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-6" dir="rtl">
        <section className="w-full space-y-5 rounded-md border bg-card p-6 text-center md:p-8">
          <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" />
          <div>
            <h1 className="mt-2 text-2xl font-black text-foreground">نتيجة {data.assessment.title}</h1>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/50 p-4">
            <div><p className="text-sm text-muted-foreground">الدرجة</p><p className="mt-1 text-2xl font-bold text-foreground">{data.attempt.score}%</p></div>
            <div><p className="text-sm text-muted-foreground">الإجابات الصحيحة</p><p className="mt-1 text-2xl font-bold text-foreground">{data.attempt.correctCount} / {data.attempt.questionCount}</p></div>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">تم التصحيح تلقائيًا، وحُفظت النتيجة في تقارير المدرسة.</p>
          <Button asChild><Link href="/student">العودة إلى لوحة الطالب</Link></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-3xl p-4 py-8 md:p-8" dir="rtl">
      <section className="space-y-5 rounded-md border bg-card p-5 md:p-7">
        <header className="flex items-start gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <Image src="/second_logo.webp" alt="شعار مدارس الإخلاص الأهلية" width={48} height={48} className="h-12 w-12 rounded-full border border-border bg-white object-contain p-0.5" />
            <Image src="/logo_new.webp" alt="شعار منصة Nexus EDU" width={48} height={48} className="h-12 w-12 rounded-xl border border-border bg-white object-contain p-0.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muted-foreground">اختبار تشخيصي · الصف {data.gradeLevel === 0 ? 'رياض الأطفال' : data.gradeLevel}</p>
            <h1 className="mt-1 text-xl font-black text-foreground">{data.assessment.title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.foundationalForGradeOne ? 'يُصحّح الاختبار تلقائيًا، وتظهر النتيجة للمدرسة.' : data.assessment.subtitle}</p>
          </div>
        </header>

        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        <div className="flex flex-wrap gap-2" aria-label="المواد التي يشملها الاختبار">
          {data.assessment.subjects.map((subject) => <span key={subject} className="border-e-2 border-teal-600 pe-2 text-xs text-muted-foreground">{subject}</span>)}
        </div>

        {currentQuestion && (
          <section className="space-y-5 border-t pt-5" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-teal-800 dark:text-teal-300">{currentQuestion.categoryLabel}</span>
              <span className="tabular-nums text-muted-foreground">السؤال {currentIndex + 1} من {questions.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={questions.length}>
              <div className="h-full bg-teal-600 transition-[width]" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
            </div>
            {currentQuestion.visual && !currentQuestion.visual.startsWith('draw:') && (
              <div className="grid min-h-40 place-items-center rounded-lg border border-border bg-muted/20 p-5" role="img" aria-label="الشكل التوضيحي للسؤال">
                <ShapeSequence value={currentQuestion.visual} size="large" />
              </div>
            )}
            <h2 className="text-lg font-bold leading-8 text-foreground">{currentQuestion.prompt}</h2>
            <fieldset className="grid gap-2">
              <legend className="sr-only">اختيارات السؤال</legend>
              {currentQuestion.options.map((option) => {
                const selected = answers[currentQuestion.id] === option;
                const isShape = [...option.trim()].length > 0 && [...option.trim()].every((glyph) => shapeGlyphs.has(glyph));
                return (
                  <label key={option} className={`flex ${isShape ? 'min-h-24' : 'min-h-16'} cursor-pointer items-center gap-3 rounded-md border p-3 text-sm leading-6 transition-colors ${selected ? 'border-teal-600 bg-teal-50 text-teal-950 dark:bg-teal-500/10 dark:text-teal-100' : 'border-border hover:bg-muted/60'}`}>
                    <input type="radio" name={currentQuestion.id} value={option} checked={selected} onChange={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }))} className="accent-teal-700" />
                    {isShape ? <span className="flex-1"><ShapeSequence value={option} size="option" /></span> : <span>{option}</span>}
                  </label>
                );
              })}
            </fieldset>
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}>
                <ArrowRight className="ms-2 h-4 w-4" />السابق
              </Button>
              {currentIndex < questions.length - 1 ? (
                <Button type="button" onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))} disabled={!answers[currentQuestion.id]}>
                  التالي<ArrowLeft className="me-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={submit} disabled={!completed || submitting}>
                  {submitting ? <LoaderCircle className="ms-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ms-2 h-4 w-4" />}
                  {submitting ? 'جارٍ حفظ النتيجة...' : 'إنهاء الاختبار وحفظ النتيجة'}
                </Button>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
