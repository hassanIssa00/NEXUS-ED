'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, BarChart3, ChevronLeft, ChevronRight, CircleHelp, Download, GraduationCap, LoaderCircle, Play, RotateCcw, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { PrintReportButton, ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from 'next-intl';

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

type ManualCatalogItem = {
  gradeLevel: number;
  gradeLabel: string;
  assessmentKey: string;
  title: string;
  subtitle: string;
  subjects: string[];
  questionCount: number;
};

type ManualQuestion = {
  id: string;
  categoryLabel: string;
  prompt: string;
  visual?: string;
  options: string[];
};

type ManualAssessment = ManualCatalogItem & { questions: ManualQuestion[] };
type ManualAttempt = Omit<AssessmentAttempt, 'studentId' | 'studentName'> & { candidateName: string };
type ManualReport = Omit<AssessmentReport, 'studentId' | 'studentName'> & { candidateName: string };

function messageFrom(error: any, isEnglish = false) {
  const message = error?.response?.data?.message ?? error?.message;
  if (isEnglish && /[\u0600-\u06FF]/.test(Array.isArray(message) ? message.join(' ') : String(message ?? ''))) {
    return 'Could not load or save the assessment report. Please try again.';
  }
  return Array.isArray(message) ? message.join(isEnglish ? ', ' : '، ') : message || (isEnglish ? 'Could not load reports.' : 'تعذر تحميل التقارير.');
}

function gradeName(level: number, isEnglish: boolean) {
  if (level === 0) return isEnglish ? 'Kindergarten' : 'رياض الأطفال';
  if (level >= 1 && level <= 6) return isEnglish ? `Grade ${level} · Elementary` : `الصف ${level} الابتدائي`;
  if (level >= 7 && level <= 9) return isEnglish ? `Grade ${level - 6} · Middle school` : `الصف ${level - 6} المتوسط`;
  return isEnglish ? `Grade ${level - 9} · Secondary` : `الصف ${level - 9} الثانوي`;
}

function formatDate(value: string, isEnglish: boolean) {
  return new Intl.DateTimeFormat(isEnglish ? 'en-US' : 'ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function PlacementAssessmentReports() {
  const { profile } = useAuth();
  const isEnglish = useLocale() === 'en';
  const text = (ar: string, en: string) => isEnglish ? en : ar;
  const canManageManualAssessments = ['teacher', 'admin', 'principal', 'vice_principal', 'counselor', 'supervisor'].includes(profile?.role ?? '');
  const [items, setItems] = useState<AssessmentAttempt[]>([]);
  const [selected, setSelected] = useState<AssessmentReport | null>(null);
  const [manualCatalog, setManualCatalog] = useState<ManualCatalogItem[]>([]);
  const [manualItems, setManualItems] = useState<ManualAttempt[]>([]);
  const [manualTotal, setManualTotal] = useState(0);
  const [manualReport, setManualReport] = useState<ManualReport | null>(null);
  const [manualAssessment, setManualAssessment] = useState<ManualAssessment | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [manualAnswers, setManualAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');
  const [pdfLoadingId, setPdfLoadingId] = useState('');
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
      .catch((requestError) => { if (active) setError(messageFrom(requestError, isEnglish)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, isEnglish]);

  useEffect(() => {
    if (!canManageManualAssessments) return;
    let active = true;
    apiClient.get('/assessments/placement/catalog')
      .then(({ data }) => { if (active) setManualCatalog(data.items ?? []); })
      .catch((requestError) => { if (active) setManualError(messageFrom(requestError, isEnglish)); });
    return () => { active = false; };
  }, [canManageManualAssessments, isEnglish]);

  useEffect(() => {
    if (!canManageManualAssessments) return;
    let active = true;
    apiClient.get('/assessments/placement/manual-reports', { params: { page, limit } })
      .then(({ data }) => {
        if (!active) return;
        setManualItems(data.items ?? []);
        setManualTotal(data.total ?? 0);
      })
      .catch((requestError) => { if (active) setManualError(messageFrom(requestError, isEnglish)); });
    return () => { active = false; };
  }, [canManageManualAssessments, page, isEnglish]);

  const openReport = async (id: string) => {
    setDetailLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get(`/assessments/placement/reports/${encodeURIComponent(id)}`);
      setSelected(data);
    } catch (requestError) {
      setError(messageFrom(requestError, isEnglish));
    } finally {
      setDetailLoading(false);
    }
  };

  const beginManualAssessment = async () => {
    setManualError('');
    setManualSuccess('');
    if (candidateName.trim().length < 2 || !gradeLevel) {
      setManualError(text('اكتب اسم المتقدم واختر الصف الدراسي أولًا.', 'Enter the candidate name and choose a grade first.'));
      return;
    }
    setManualLoading(true);
    try {
      const { data } = await apiClient.get(`/assessments/placement/catalog/${gradeLevel}`);
      setManualAssessment(data);
      setManualAnswers({});
      setQuestionIndex(0);
      setManualReport(null);
    } catch (requestError) {
      setManualError(messageFrom(requestError, isEnglish));
    } finally {
      setManualLoading(false);
    }
  };

  const saveManualAssessment = async () => {
    if (!manualAssessment || !manualAssessment.questions.every((question) => manualAnswers[question.id])) return;
    setManualBusy(true);
    setManualError('');
    setManualSuccess('');
    try {
      const { data } = await apiClient.post('/assessments/placement/manual', {
        candidateName: candidateName.trim(),
        gradeLevel: manualAssessment.gradeLevel,
        answers: manualAnswers,
      });
      const { data: report } = await apiClient.get(`/assessments/placement/manual-reports/${encodeURIComponent(data.id)}`);
      setManualReport(report);
      setManualSuccess(isEnglish
        ? `Assessment for ${report.candidateName} was saved to placement reports.`
        : `تم حفظ اختبار ${report.candidateName} في تقارير اختبارات تحديد المستوى.`);
      setManualAssessment(null);
      setManualAnswers({});
      setCandidateName('');
      const { data: list } = await apiClient.get('/assessments/placement/manual-reports', { params: { page, limit } });
      setManualItems(list.items ?? []);
      setManualTotal(list.total ?? 0);
    } catch (requestError) {
      setManualError(messageFrom(requestError, isEnglish));
    } finally {
      setManualBusy(false);
    }
  };

  const openManualReport = async (id: string) => {
    setManualLoading(true);
    setManualError('');
    try {
      const { data } = await apiClient.get(`/assessments/placement/manual-reports/${encodeURIComponent(id)}`);
      setManualReport(data);
    } catch (requestError) {
      setManualError(messageFrom(requestError, isEnglish));
    } finally {
      setManualLoading(false);
    }
  };

  const downloadManualReport = async (id: string) => {
    setPdfLoadingId(id);
    setManualError('');
    try {
      const response = await apiClient.get(`/assessments/placement/manual-reports/${encodeURIComponent(id)}/pdf`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Nexus-placement-${id.slice(-8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setManualError(messageFrom(requestError, isEnglish));
    } finally {
      setPdfLoadingId('');
    }
  };

  const currentQuestion = manualAssessment?.questions[questionIndex];
  const manualProgress = manualAssessment ? Math.round(((questionIndex + 1) / manualAssessment.questions.length) * 100) : 0;
  const pageCount = Math.max(1, Math.ceil(Math.max(total, canManageManualAssessments ? manualTotal : 0) / limit));

  return (
    <main className="report-print-root mx-auto max-w-6xl space-y-6 p-4 py-7 md:p-8" dir={isEnglish ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={text('تقارير الاختبارات التشخيصية', 'Placement assessment reports')} subtitle={text('نتائج محفوظة في ملفات الطلاب ضمن نطاق صلاحيات حسابك', 'Results saved in student records within your account permissions')} />
      <header className="flex flex-wrap items-start gap-3 border-b pb-5">
        <BarChart3 className="mt-1 h-6 w-6 text-teal-700 dark:text-teal-300" />
        <div>
          <h1 className="text-xl font-bold text-foreground">{text('تقارير الاختبارات التشخيصية', 'Placement assessment reports')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{text('نتائج محفوظة في ملفات الطلاب ضمن نطاق صلاحيات حسابك.', 'Results saved in student records within your account permissions.')}</p>
        </div>
        <span className="me-auto text-sm tabular-nums text-muted-foreground">{canManageManualAssessments ? total + manualTotal : total} {text('تقرير', 'reports')}</span>
        {!loading && !error && (items.length > 0 || selected || manualItems.length > 0 || manualReport) && <PrintReportButton />}
      </header>

      {canManageManualAssessments && (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7" aria-labelledby="manual-placement-title">
          <header className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800"><GraduationCap className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 id="manual-placement-title" className="text-lg font-black text-slate-900">{text('اختبار تحديد مستوى لمتقدم', 'Run a placement assessment')}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{text('نفس الاختبار التشخيصي الذي يظهر للطالب أثناء التسجيل، من الروضة حتى الثالث الثانوي. تُحفظ الإجابات والتقرير في سجلات المدرسة.', 'Run the same diagnostic assessment shown during student registration, from kindergarten through Grade 12. Answers and the report are saved in school records.')}</p>
            </div>
          </header>

          {manualSuccess && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{manualSuccess}</p>}
          {manualError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{manualError}</div>}

          {!manualAssessment ? (
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                {text('اسم المتقدم', 'Candidate name')}
                <span className="relative block"><UserRound className={`absolute ${isEnglish ? 'left-3' : 'right-3'} top-3 h-4 w-4 text-slate-400`} /><input value={candidateName} onChange={(event) => setCandidateName(event.target.value)} maxLength={160} placeholder={text('اكتب الاسم الكامل', 'Enter the full name')} className={`h-11 w-full rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 ${isEnglish ? 'px-10 text-left' : 'px-10 text-right'}`} /></span>
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                {text('الصف المطلوب تحديد مستواه', 'Grade to assess')}
                <select value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
                  <option value="">{text('اختر الصف', 'Choose a grade')}</option>
                  {manualCatalog.map((item) => <option key={item.gradeLevel} value={item.gradeLevel}>{isEnglish ? gradeName(item.gradeLevel, true) : item.gradeLabel} · {item.questionCount} {text('سؤال', 'questions')}</option>)}
                </select>
              </label>
              <Button type="button" onClick={() => void beginManualAssessment()} disabled={manualLoading || !manualCatalog.length} className="h-11 rounded-xl bg-[#35556B] px-5 text-white hover:bg-[#234A65]">
                {manualLoading ? <LoaderCircle className="ms-2 h-4 w-4 animate-spin" /> : <Play className="ms-2 h-4 w-4" />}
                {text('بدء الاختبار', 'Start assessment')}
              </Button>
              {!manualCatalog.length && !manualError && <p className="text-xs text-muted-foreground md:col-span-3">{text('جارٍ تحميل اختبارات الصفوف...', 'Loading grade assessments…')}</p>}
            </div>
          ) : currentQuestion ? (
            <div className="space-y-5 rounded-2xl border border-slate-200 p-4 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-teal-800">{isEnglish ? gradeName(manualAssessment.gradeLevel, true) : manualAssessment.gradeLabel} · {manualAssessment.title}</p><p className="mt-1 text-sm text-slate-500">{text('المتقدم:', 'Candidate:')} {candidateName}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold tabular-nums text-slate-700">{text('السؤال', 'Question')} {questionIndex + 1} {text('من', 'of')} {manualAssessment.questions.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={manualProgress} aria-valuemin={0} aria-valuemax={100} aria-label={text('تقدم الاختبار', 'Assessment progress')}><div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: `${manualProgress}%` }} /></div>
              <article className="rounded-2xl bg-slate-50 p-5" aria-live="polite">
                <p className="text-xs font-bold text-teal-800">{currentQuestion.categoryLabel}</p>
                <h3 className="mt-2 text-lg font-bold leading-8 text-slate-900">{currentQuestion.prompt}</h3>
                {currentQuestion.visual && <p className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-center text-lg font-semibold text-slate-700">{currentQuestion.visual}</p>}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {currentQuestion.options.map((option, index) => {
                    const chosen = manualAnswers[currentQuestion.id] === option;
                    return <button key={`${currentQuestion.id}-${index}`} type="button" aria-pressed={chosen} onClick={() => setManualAnswers((current) => ({ ...current, [currentQuestion.id]: option }))} className={`min-h-12 rounded-xl border px-4 py-3 text-right text-sm font-semibold transition ${chosen ? 'border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-100' : 'border-slate-200 bg-white text-slate-800 hover:border-teal-400 hover:bg-teal-50/50'}`}><span className="ms-2 inline-grid size-6 place-items-center rounded-full bg-slate-100 text-xs text-slate-600">{index + 1}</span>{option}</button>;
                  })}
                </div>
              </article>
              <footer className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => questionIndex === 0 ? setManualAssessment(null) : setQuestionIndex((index) => Math.max(0, index - 1))} disabled={manualBusy}><ArrowRight className="ms-2 h-4 w-4" />{questionIndex === 0 ? text('إلغاء الاختبار', 'Cancel assessment') : text('السؤال السابق', 'Previous question')}</Button>
                {questionIndex < manualAssessment.questions.length - 1 ? (
                  <Button type="button" onClick={() => setQuestionIndex((index) => Math.min(manualAssessment.questions.length - 1, index + 1))} disabled={!manualAnswers[currentQuestion.id]} className="bg-[#35556B] text-white hover:bg-[#234A65]">{text('السؤال التالي', 'Next question')}<ChevronLeft className="me-2 h-4 w-4" /></Button>
                ) : (
                  <Button type="button" onClick={() => void saveManualAssessment()} disabled={manualBusy || !manualAssessment.questions.every((question) => manualAnswers[question.id])} className="bg-emerald-700 text-white hover:bg-emerald-800">{manualBusy ? <LoaderCircle className="ms-2 h-4 w-4 animate-spin" /> : <GraduationCap className="ms-2 h-4 w-4" />}{text('إرسال الاختبار وحفظ التقرير', 'Submit assessment and save report')}</Button>
                )}
              </footer>
            </div>
          ) : null}
        </section>
      )}

      {error && <div role="alert" className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      <section aria-label={text('قائمة نتائج الاختبارات', 'Assessment results')}>
        <div className="hidden grid-cols-[minmax(12rem,1.4fr)_1fr_1fr_1fr_2fr_auto] gap-4 border-b px-3 py-2 text-xs font-bold text-muted-foreground md:grid">
          <span>{text('الطالب', 'Student')}</span><span>{text('الصف', 'Grade')}</span><span>{text('الدرجة', 'Score')}</span><span>{text('الإجابات', 'Answers')}</span><span>{text('تاريخ الإكمال', 'Completed')}</span><span />
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><LoaderCircle className="h-6 w-6 animate-spin text-teal-700" aria-label={text('جارٍ تحميل التقارير', 'Loading reports')} /></div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 py-12 text-sm text-muted-foreground"><CircleHelp className="h-5 w-5" />{text('لا توجد نتائج اختبارات محفوظة ضمن نطاق صلاحياتك.', 'No assessment results are available within your account permissions.')}</div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="grid gap-2 px-3 py-4 text-sm md:grid-cols-[minmax(12rem,1.4fr)_1fr_1fr_1fr_2fr_auto] md:items-center md:gap-4">
                <span className="font-semibold text-foreground">{item.studentName}</span>
                <span className="text-muted-foreground">{gradeName(item.gradeLevel, isEnglish)}</span>
                <span className="font-bold tabular-nums text-foreground">{item.score}%</span>
                <span className="tabular-nums text-muted-foreground">{item.correctCount} / {item.questionCount}</span>
                <time className="text-xs text-muted-foreground" dateTime={item.completedAt}>{formatDate(item.completedAt, isEnglish)}</time>
                <Button className="print:hidden" variant="outline" size="sm" onClick={() => openReport(item.id)} disabled={detailLoading}>
                  {detailLoading ? <LoaderCircle className="ms-2 h-4 w-4 animate-spin" /> : null}{text('عرض التقرير', 'View report')}
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="print:hidden flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">{text('صفحة', 'Page')} {page} {text('من', 'of')} {pageCount}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" aria-label={text('الصفحة السابقة', 'Previous page')} title={text('الصفحة السابقة', 'Previous page')} onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" aria-label={text('الصفحة التالية', 'Next page')} title={text('الصفحة التالية', 'Next page')} onClick={() => setPage((value) => value + 1)} disabled={page >= pageCount || loading}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      {canManageManualAssessments && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-labelledby="manual-reports-title">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><h2 id="manual-reports-title" className="font-black text-slate-900">{text('اختبارات المتقدمين التي أجرتها المدرسة', 'Applicant assessments administered by the school')}</h2><p className="mt-1 text-xs text-slate-500">{text('تقارير كاملة محفوظة باسم المتقدم والصف والإجابات.', 'Full reports saved with the candidate name, grade, and answers.')}</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold tabular-nums text-slate-600">{manualTotal} {text('تقرير', 'reports')}</span>
          </header>
          {manualItems.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">{text('لا توجد اختبارات تحديد مستوى لمتقدمين حتى الآن.', 'No applicant placement assessments have been completed yet.')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {manualItems.map((item) => (
                <article key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><UserRound className="h-4 w-4" /></span>
                  <div className="min-w-[10rem] flex-1"><p className="font-bold text-slate-900">{item.candidateName}</p><p className="mt-1 text-xs text-slate-500">{gradeName(item.gradeLevel, isEnglish)} · {formatDate(item.completedAt, isEnglish)}</p></div>
                  <div className="text-sm"><span className="font-black tabular-nums text-slate-900">{item.score}%</span><span className="ms-2 text-xs tabular-nums text-slate-500">{item.correctCount} / {item.questionCount}</span></div>
                  <Button type="button" size="sm" variant="outline" onClick={() => void openManualReport(item.id)} disabled={manualLoading}><CircleHelp className="ms-2 h-4 w-4" />{text('عرض الإجابات', 'View answers')}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void downloadManualReport(item.id)} disabled={pdfLoadingId === item.id}>{pdfLoadingId === item.id ? <LoaderCircle className="ms-2 h-4 w-4 animate-spin" /> : <Download className="ms-2 h-4 w-4" />}{text('تنزيل PDF', 'Download PDF')}</Button>
                </article>
              ))}
            </div>
          )}
          {manualTotal > limit && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{text('تُعرض التقارير في الصفحات نفسها أعلاه: صفحة', 'These reports use the pagination above: page')} {page} {text('من', 'of')} {Math.max(1, Math.ceil(manualTotal / limit))}.</p>}
        </section>
      )}

      {manualReport && (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7" aria-labelledby="manual-report-detail-title">
          <header className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1"><p className="text-xs font-bold text-teal-800">{text('تقرير اختبار تحديد المستوى', 'Placement assessment report')}</p><h2 id="manual-report-detail-title" className="mt-1 text-lg font-black text-slate-900">{manualReport.candidateName}</h2><p className="mt-1 text-sm text-slate-600">{gradeName(manualReport.gradeLevel, isEnglish)} · {manualReport.correctCount} {text('من', 'of')} {manualReport.questionCount} {text('إجابة صحيحة', 'correct answers')} · {manualReport.score}% · {formatDate(manualReport.completedAt, isEnglish)}</p></div>
            <div className="flex gap-2 print:hidden"><Button type="button" variant="outline" onClick={() => void downloadManualReport(manualReport.id)} disabled={pdfLoadingId === manualReport.id}>{pdfLoadingId === manualReport.id ? <LoaderCircle className="ms-2 h-4 w-4 animate-spin" /> : <Download className="ms-2 h-4 w-4" />}{text('تنزيل PDF', 'Download PDF')}</Button><Button type="button" variant="outline" onClick={() => setManualReport(null)}><RotateCcw className="ms-2 h-4 w-4" />{text('إغلاق التقرير', 'Close report')}</Button></div>
          </header>
          <ol className="divide-y border-y">
            {manualReport.answers.map((answer, index) => (
              <li key={answer.id} className="grid gap-2 py-4 md:grid-cols-[2rem_1fr]">
                <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
                <div className="space-y-2"><p className="text-xs font-semibold text-teal-800">{answer.category}</p><p className="text-sm font-semibold leading-6 text-foreground">{answer.prompt}</p><p className="text-sm leading-6 text-muted-foreground">{text('إجابة المتقدم:', 'Candidate answer:')} <span className={answer.isCorrect ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{answer.selectedAnswer ?? text('لا توجد إجابة محفوظة', 'No answer saved')}</span></p>{!answer.isCorrect && <p className="text-sm leading-6 text-muted-foreground">{text('الإجابة الصحيحة:', 'Correct answer:')} <span className="font-semibold text-foreground">{answer.correctAnswer}</span></p>}<p className="text-xs leading-5 text-muted-foreground">{answer.explanation}</p></div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {selected && (
        <section className="space-y-5 border-t pt-6" aria-labelledby="report-detail-title">
          <header className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 id="report-detail-title" className="text-lg font-bold text-foreground">{selected.studentName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{gradeName(selected.gradeLevel, isEnglish)} · {selected.correctCount} {text('من', 'of')} {selected.questionCount} {text('إجابة صحيحة', 'correct answers')} · {selected.score}%</p>
            </div>
            <Button className="print:hidden" type="button" variant="outline" onClick={() => setSelected(null)}>{text('إغلاق التقرير', 'Close report')}</Button>
          </header>
          <ol className="divide-y border-y">
            {selected.answers.map((answer, index) => (
              <li key={answer.id} className="grid gap-2 py-4 md:grid-cols-[2rem_1fr]">
                <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">{answer.category}</p>
                  <p className="text-sm font-semibold leading-6 text-foreground">{answer.prompt}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{text('إجابة الطالب:', 'Student answer:')} <span className={answer.isCorrect ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-rose-700 dark:text-rose-300'}>{answer.selectedAnswer ?? text('لا توجد إجابة محفوظة', 'No answer saved')}</span></p>
                  {!answer.isCorrect && <p className="text-sm leading-6 text-muted-foreground">{text('الإجابة الصحيحة:', 'Correct answer:')} <span className="font-semibold text-foreground">{answer.correctAnswer}</span></p>}
                  <p className="text-xs leading-5 text-muted-foreground">{answer.explanation}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      <ReportPrintFooter />
    </main>
  );
}
