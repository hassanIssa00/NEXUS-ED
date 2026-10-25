'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { BookOpen, LoaderCircle, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { curriculaList } from '@/lib/curriculaData';
import { parseClassName } from '@/lib/school-class-hierarchy';

export type TeacherQuestion = {
  id: string;
  prompt: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  points: number;
  options: Array<{ text: string; correct: boolean }>;
  correctAnswer: string;
};

type LessonOption = { id: string; title: string; content?: string | null; subjectId: string };
type PdfTextPage = { pageNumber: number; text: string };
export type GeneratedSource = { kind: 'uploaded-pdf'; title: string; pageFrom: number; pageTo: number; file: File };
type Props = {
  subjectId: string;
  subjectName?: string;
  subjectClassName?: string;
  initialBookSlug?: string;
  initialPageFrom?: number;
  initialPageTo?: number;
  onGenerated: (questions: TeacherQuestion[], source?: GeneratedSource) => void;
};

const PAGE_LIMIT = 3;

function bookMatchesSubject(title: string, subjectName = '') {
  const value = `${title} ${subjectName}`.toLocaleLowerCase('ar');
  if (/جزء عم|مصحف|القرآن الكريم/.test(value)) return 'quran';
  if (/لغتي|عربي|لغة عربية/.test(value)) return 'lughati';
  if (/رياض/.test(value)) return 'math';
  if (/إسلام|اسلام|قرآن|قران/.test(value)) return 'islamic';
  if (/علوم/.test(value)) return 'science';
  if (/إنجليزي|انجليزي|إنجليزية|انجليزية|english/.test(value)) return 'english';
  if (/مهارات حياتية|حياتية وأسرية/.test(value)) return 'life-skills';
  if (/فنية|فن/.test(value)) return 'art';
  return null;
}

function questionFromAi(raw: any, index: number, isEnglish: boolean): TeacherQuestion {
  const type = raw?.type;
  const id = `q-${Date.now().toString(36)}-${index}`;
  if (type === 'multiple_choice') {
    const options = Array.isArray(raw.options) ? raw.options.map((text: string) => ({
      text: String(text),
      correct: String(text) === String(raw.correctAnswer),
    })) : [];
    return { id, prompt: String(raw.question || ''), type, points: 1, options, correctAnswer: String(raw.correctAnswer || '') };
  }
  if (type === 'true_false') {
    const correctAnswer = raw.correctAnswer === 'صحيح' ? 'true' : 'false';
    return { id, prompt: String(raw.question || ''), type, points: 1, options: [], correctAnswer };
  }
  if (type === 'short_answer' || type === 'essay') {
    return { id, prompt: String(raw.question || ''), type, points: 1, options: [], correctAnswer: String(raw.correctAnswer || '') };
  }
  throw new Error(isEnglish ? 'The AI service returned a question in an unsupported format.' : 'وصل سؤال بتنسيق غير معروف من خدمة الذكاء الاصطناعي.');
}

function getErrorMessage(error: any, isEnglish: boolean) {
  const message = error?.response?.data?.message ?? error?.message;
  const result = Array.isArray(message) ? message.join(isEnglish ? ', ' : '، ') : message;
  if (typeof result === 'string' && !(isEnglish && /[\u0600-\u06ff]/.test(result))) return result;
  return isEnglish ? 'Could not create the questions. Please try again.' : 'تعذر إنشاء الأسئلة. حاول مرة أخرى.';
}

export function AiQuestionBuilder({ subjectId, subjectName, subjectClassName, initialBookSlug, initialPageFrom, initialPageTo, onGenerated }: Props) {
  const isEnglish = useLocale() === 'en';
  const copy = (ar: string, en: string) => isEnglish ? en : ar;
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [lessonId, setLessonId] = useState('');
  const [sourceKind, setSourceKind] = useState<'lesson' | 'book' | 'pdf'>(initialBookSlug ? 'book' : 'lesson');
  const [bookSlug, setBookSlug] = useState(initialBookSlug || '');
  const [unitIndex, setUnitIndex] = useState(0);
  const [pageFrom, setPageFrom] = useState(initialPageFrom || 1);
  const [pageTo, setPageTo] = useState(initialPageTo || initialPageFrom || 1);
  const [questionType, setQuestionType] = useState<'mixed' | TeacherQuestion['type']>('mixed');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState('');
  const [initialRangeApplied, setInitialRangeApplied] = useState(false);
  const [pdfPages, setPdfPages] = useState<PdfTextPage[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractingPdf, setExtractingPdf] = useState(false);

  const subjectLessons = useMemo(() => lessons.filter((lesson) => lesson.subjectId === subjectId), [lessons, subjectId]);
  const subjectGrade = subjectClassName ? parseClassName(subjectClassName).grade : null;
  const availableBooks = useMemo(() => {
    const match = bookMatchesSubject(subjectName || '');
    return curriculaList.filter((book) => Boolean(match) && book.slug === match && (!subjectGrade || parseClassName(book.grade).grade === subjectGrade));
  }, [subjectName, subjectGrade]);
  const selectedBook = availableBooks.find((book) => book.slug === bookSlug) || availableBooks[0];
  const selectedUnit = selectedBook?.units[unitIndex] || selectedBook?.units[0];
  const selectedPageCount = sourceKind === 'book' && selectedUnit
    ? Math.max(1, Math.min(pageTo, selectedUnit.toPage) - Math.max(pageFrom, selectedUnit.fromPage) + 1)
    : sourceKind === 'pdf' ? Math.max(1, Math.min(pageTo, pdfPages.length) - Math.max(pageFrom, 1) + 1) : 1;
  const pageBatchCount = Math.ceil(selectedPageCount / PAGE_LIMIT);
  const maxQuestionCount = Math.max(30, pageBatchCount * 30);

  useEffect(() => {
    if (sourceKind === 'book' || sourceKind === 'pdf') setCount((current) => Math.min(maxQuestionCount, Math.max(current, pageBatchCount)));
  }, [sourceKind, pageBatchCount, maxQuestionCount]);

  const readUploadedPdf = async (file: File) => {
    setError('');
    setPdfPages([]);
    setPdfFile(null);
    if (file.type !== 'application/pdf' || file.size > 15 * 1024 * 1024) {
      setError(copy('اختر ملف PDF صالحًا لا يتجاوز 15 ميجابايت.', 'Choose a valid PDF file no larger than 15 MB.'));
      return;
    }
    setExtractingPdf(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post('/upload/pdf-to-text', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const payload = data?.data ?? data;
      const pages = Array.isArray(payload?.pages) ? payload.pages.filter((page: any) => Number.isInteger(page.pageNumber) && typeof page.text === 'string') as PdfTextPage[] : [];
      if (!pages.length || !pages.some((page) => page.text.trim())) {
        throw new Error(copy('لم أجد نصًا قابلًا للقراءة في الملف. استخدم PDF نصيًا أو اختر صفحات من مكتبة المناهج.', 'No readable text was found in this file. Use a text-based PDF or choose pages from the curriculum library.'));
      }
      setPdfPages(pages);
      setPdfFile(file);
      setPageFrom(1);
      setPageTo(Math.min(PAGE_LIMIT, pages.length));
      setSourceKind('pdf');
    } catch (caught: any) {
      setError(getErrorMessage(caught, isEnglish));
    } finally {
      setExtractingPdf(false);
    }
  };

  useEffect(() => {
    if (!subjectId) return;
    let active = true;
    setLoadingLessons(true);
    apiClient.get<LessonOption[]>('/lessons/my')
      .then(({ data }) => {
        if (!active) return;
        const next = Array.isArray(data) ? data : [];
        setLessons(next);
        const matching = next.find((lesson) => lesson.subjectId === subjectId && Boolean(lesson.content?.trim()));
        setLessonId(matching?.id || next.find((lesson) => lesson.subjectId === subjectId)?.id || '');
        if (!matching && availableBooks.length) setSourceKind('book');
      })
      .catch(() => { if (active) setLessons([]); })
      .finally(() => { if (active) setLoadingLessons(false); });
    return () => { active = false; };
  }, [subjectId, availableBooks.length]);

  useEffect(() => {
    if (!availableBooks.length) {
      setBookSlug('');
      return;
    }
    if (!availableBooks.some((book) => book.slug === bookSlug)) setBookSlug(availableBooks[0].slug);
  }, [availableBooks, bookSlug]);

  useEffect(() => {
    if (!selectedUnit) return;
    if (!initialRangeApplied && initialBookSlug && selectedBook?.slug === initialBookSlug && initialPageFrom && initialPageTo) {
      const matchingUnitIndex = selectedBook.units.findIndex((unit) => initialPageFrom >= unit.fromPage && initialPageTo <= unit.toPage);
      if (matchingUnitIndex >= 0 && matchingUnitIndex !== unitIndex) {
        setUnitIndex(matchingUnitIndex);
        return;
      }
      const start = Math.max(selectedUnit.fromPage, Math.min(initialPageFrom, selectedUnit.toPage));
      setPageFrom(start);
      setPageTo(Math.max(start, Math.min(initialPageTo, selectedUnit.toPage)));
      setInitialRangeApplied(true);
      return;
    }
    setPageFrom(selectedUnit.fromPage);
    setPageTo(Math.min(selectedUnit.fromPage + PAGE_LIMIT - 1, selectedUnit.toPage));
  }, [bookSlug, unitIndex, selectedUnit?.fromPage, selectedUnit?.toPage, initialRangeApplied, initialBookSlug, initialPageFrom, initialPageTo, selectedBook]);

  const generate = async () => {
    if (!subjectId) {
      setError(copy('اختر المادة أولًا.', 'Select a subject first.'));
      return;
    }
    setGenerating(true);
    setGenerationStatus('');
    setError('');
    try {
      let response;
      if (sourceKind === 'lesson') {
        if (!lessonId || !subjectLessons.some((lesson) => lesson.id === lessonId)) {
          throw new Error(copy('اختر درسًا مرتبطًا بالمادة المحددة.', 'Choose a lesson linked to the selected subject.'));
        }
        response = await apiClient.post('/ai/suggest-questions', {
          subjectId,
          lessonId,
          topic: subjectLessons.find((lesson) => lesson.id === lessonId)?.title || copy('محتوى الدرس', 'Lesson content'),
          count,
          difficulty,
          questionType,
        });
      } else if (sourceKind === 'pdf') {
        if (!pdfFile || !pdfPages.length) throw new Error(copy('ارفع كتابًا بصيغة PDF وحدد صفحاته أولًا.', 'Upload a PDF book and select its pages first.'));
        const start = Math.max(1, Math.min(pageFrom, pdfPages.length));
        const end = Math.max(start, Math.min(pageTo, pdfPages.length));
        const batches: Array<{ from: number; to: number }> = [];
        for (let from = start; from <= end; from += PAGE_LIMIT) batches.push({ from, to: Math.min(end, from + PAGE_LIMIT - 1) });
        if (count < batches.length) throw new Error(copy(`هذا النطاق يحتاج إلى ${batches.length} أسئلة على الأقل حتى تُقرأ كل الصفحات.`, `This page range needs at least ${batches.length} questions so every page can be processed.`));
        const baseCount = Math.floor(count / batches.length);
        const extraCount = count % batches.length;
        const generated: TeacherQuestion[] = [];
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
          const batch = batches[batchIndex];
          const sourceText = pdfPages
            .filter((page) => page.pageNumber >= batch.from && page.pageNumber <= batch.to)
            .map((page) => `${copy('صفحة', 'Page')} ${page.pageNumber}:\n${page.text.trim()}`)
            .filter((page) => page.trim().length > 10)
            .join('\n\n');
          if (!sourceText) throw new Error(copy(`لا يوجد نص قابل للقراءة في الصفحات ${batch.from}–${batch.to} من الملف.`, `No readable text was found on PDF pages ${batch.from}–${batch.to}.`));
          setGenerationStatus(copy(`قراءة صفحات الملف ${batch.from}–${batch.to} · الدفعة ${batchIndex + 1} من ${batches.length}`, `Reading PDF pages ${batch.from}–${batch.to} · batch ${batchIndex + 1} of ${batches.length}`));
          const { data } = await apiClient.post('/ai/suggest-questions', {
            subjectId,
            topic: `${pdfFile.name} · الصفحات ${batch.from}–${batch.to}`,
            sourceText,
            count: baseCount + (batchIndex < extraCount ? 1 : 0),
            difficulty,
            questionType,
          });
          const batchQuestions = data?.data?.questions;
          if (!Array.isArray(batchQuestions) || batchQuestions.length === 0) throw new Error(copy(`لم تصل أسئلة صالحة من صفحات الملف ${batch.from}–${batch.to}.`, `No valid questions were returned for PDF pages ${batch.from}–${batch.to}.`));
          generated.push(...batchQuestions.map((question: any) => questionFromAi(question, generated.length, isEnglish)));
        }
        setGenerationStatus(copy(`اكتمل إنشاء ${generated.length} سؤالًا من صفحات الملف ${start}–${end}.`, `Created ${generated.length} questions from PDF pages ${start}–${end}.`));
        onGenerated(generated, { kind: 'uploaded-pdf', title: pdfFile.name, pageFrom: start, pageTo: end, file: pdfFile });
        return;
      } else {
        if (!selectedBook || !selectedUnit) throw new Error(copy('اختر كتابًا ووحدة من المنهج.', 'Choose a curriculum book and unit.'));
        const start = Math.max(selectedUnit.fromPage, Math.min(pageFrom, selectedUnit.toPage));
        const end = Math.max(start, Math.min(pageTo, selectedUnit.toPage));
        const batches: Array<{ from: number; to: number }> = [];
        for (let from = start; from <= end; from += PAGE_LIMIT) {
          batches.push({ from, to: Math.min(end, from + PAGE_LIMIT - 1) });
        }
        if (count < batches.length) {
          throw new Error(copy(`هذا النطاق يحتاج إلى ${batches.length} سؤالًا على الأقل حتى يقرأ الذكاء الاصطناعي كل الصفحات. زِد عدد الأسئلة أو قلّل النطاق.`, `This page range requires at least ${batches.length} questions so AI can process every page. Increase the question count or reduce the range.`));
        }

        const baseCount = Math.floor(count / batches.length);
        const extraCount = count % batches.length;
        const generated: TeacherQuestion[] = [];
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
          const batch = batches[batchIndex];
          setGenerationStatus(copy(`قراءة الصفحات ${batch.from}–${batch.to} · الدفعة ${batchIndex + 1} من ${batches.length}`, `Reading pages ${batch.from}–${batch.to} · batch ${batchIndex + 1} of ${batches.length}`));
          const form = new FormData();
          form.append('subjectId', subjectId);
          form.append('topic', `${selectedBook.title} — ${selectedUnit.title}`);
          form.append('curriculumTitle', selectedBook.title);
          form.append('unitTitle', selectedUnit.title);
          form.append('pageFrom', String(batch.from));
          form.append('pageTo', String(batch.to));
          form.append('count', String(baseCount + (batchIndex < extraCount ? 1 : 0)));
          form.append('difficulty', difficulty);
          form.append('questionType', questionType);
          const pageFiles = await Promise.all(Array.from({ length: batch.to - batch.from + 1 }, async (_, offset) => {
            const page = batch.from + offset;
            const fileResponse = await fetch(`/resources/curricula/${selectedBook.slug}/page-${String(page).padStart(3, '0')}.jpg`);
            if (!fileResponse.ok) throw new Error(copy(`صفحة ${page} من الكتاب غير متاحة الآن.`, `Book page ${page} is currently unavailable.`));
            const blob = await fileResponse.blob();
            return new File([blob], `page-${page}.jpg`, { type: 'image/jpeg' });
          }));
          pageFiles.forEach((file) => form.append('pages', file));
          const { data } = await apiClient.post('/ai/suggest-questions', form, { headers: { 'Content-Type': 'multipart/form-data' } });
          const batchQuestions = data?.data?.questions;
          if (!Array.isArray(batchQuestions) || batchQuestions.length === 0) {
            throw new Error(copy(`لم تصل أسئلة صالحة من الصفحات ${batch.from}–${batch.to}.`, `No valid questions were returned for pages ${batch.from}–${batch.to}.`));
          }
          generated.push(...batchQuestions.map((question: any) => questionFromAi(question, generated.length, isEnglish)));
        }
        setGenerationStatus(copy(`اكتمل إنشاء ${generated.length} أسئلة من الصفحات ${start}–${end}.`, `Created ${generated.length} questions from pages ${start}–${end}.`));
        onGenerated(generated);
        return;
      }

      const rawQuestions = response.data?.data?.questions;
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) throw new Error(copy('لم تصل أسئلة صالحة من خدمة الذكاء الاصطناعي.', 'The AI service returned no valid questions.'));
      onGenerated(rawQuestions.map((question: any, index: number) => questionFromAi(question, index, isEnglish)));
    } catch (caught: any) {
      setError(getErrorMessage(caught, isEnglish));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="space-y-3 rounded-md border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/20" aria-label={copy('إنشاء الأسئلة بالذكاء الاصطناعي', 'Generate questions with AI')}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-teal-700" />
        <h3 className="text-sm font-semibold">{copy('أنشئ الأسئلة من درس أو كتاب المنهج', 'Create questions from a lesson or curriculum book')}</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs"><span>{copy('مصدر الأسئلة', 'Question source')}</span><select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as 'lesson' | 'book' | 'pdf')} className="h-9 w-full rounded-md border bg-background px-2 text-sm"><option value="lesson">{copy('درس محفوظ في المنصة', 'Lesson saved on the platform')}</option><option value="book" disabled={!availableBooks.length}>{copy('صفحات كتاب المنهج الرقمي', 'Digital curriculum book pages')}</option><option value="pdf">{copy('ملف كتاب PDF أرفعه الآن', 'Upload a PDF book now')}</option></select></label>
        {sourceKind === 'lesson' ? (
          <label className="space-y-1 text-xs"><span>{copy('الدرس', 'Lesson')}</span><select value={lessonId} onChange={(event) => setLessonId(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm" disabled={loadingLessons || !subjectLessons.length}><option value="">{loadingLessons ? copy('تحميل الدروس...', 'Loading lessons...') : copy('اختر درسًا', 'Select a lesson')}</option>{subjectLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}{!lesson.content?.trim() ? copy(' (يحتاج محتوى)', ' (content needed)') : ''}</option>)}</select></label>
        ) : (
          <label className="space-y-1 text-xs"><span>{copy('الكتاب', 'Book')}</span><select value={selectedBook?.slug || ''} onChange={(event) => { setBookSlug(event.target.value); setUnitIndex(0); }} className="h-9 w-full rounded-md border bg-background px-2 text-sm" disabled={!availableBooks.length}><option value="">{copy('لا يوجد كتاب مطابق', 'No matching book')}</option>{availableBooks.map((book) => <option key={book.slug} value={book.slug}>{book.title} · {book.grade}</option>)}</select></label>
        )}
      </div>
      {sourceKind === 'pdf' && <div className="grid gap-3 rounded-lg border border-dashed border-teal-300 bg-background p-3 sm:grid-cols-[minmax(0,1fr)_110px_110px] sm:items-end">
        <label className="space-y-1 text-xs"><span>{copy('ملف الكتاب PDF (حد أقصى 15 ميجابايت)', 'PDF book file (15 MB maximum)')}</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readUploadedPdf(file); }} className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:font-semibold file:text-white" />{extractingPdf ? <span className="text-teal-700">{copy('جارٍ استخراج نص صفحات الكتاب…', 'Extracting text from book pages…')}</span> : pdfFile && <span className="block truncate text-muted-foreground">{pdfFile.name} · {pdfPages.length} {copy('صفحة', 'pages')}</span>}</label>
        <label className="space-y-1 text-xs"><span>{copy('من صفحة', 'From page')}</span><input type="number" min={1} max={pdfPages.length || 1} value={pageFrom} disabled={!pdfPages.length} onChange={(event) => setPageFrom(Number(event.target.value))} className="h-9 w-full rounded-md border bg-background px-2 text-sm" /></label>
        <label className="space-y-1 text-xs"><span>{copy('إلى صفحة', 'To page')}</span><input type="number" min={pageFrom} max={pdfPages.length || 1} value={pageTo} disabled={!pdfPages.length} onChange={(event) => setPageTo(Number(event.target.value))} className="h-9 w-full rounded-md border bg-background px-2 text-sm" /></label>
      </div>}
      {sourceKind === 'book' && selectedBook && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_110px]">
          <label className="space-y-1 text-xs"><span>{copy('الوحدة أو الدرس', 'Unit or lesson')}</span><select value={unitIndex} onChange={(event) => setUnitIndex(Number(event.target.value))} className="h-9 w-full rounded-md border bg-background px-2 text-sm">{selectedBook.units.map((unit, index) => <option key={`${unit.title}-${index}`} value={index}>{unit.title} · {copy('ص', 'p.')} {unit.fromPage}–{unit.toPage}</option>)}</select></label>
          <label className="space-y-1 text-xs"><span>{copy('من صفحة', 'From page')}</span><input type="number" min={selectedUnit?.fromPage} max={selectedUnit?.toPage} value={pageFrom} onChange={(event) => setPageFrom(Number(event.target.value))} className="h-9 w-full rounded-md border bg-background px-2 text-sm" /></label>
          <label className="space-y-1 text-xs"><span>{copy('إلى صفحة', 'To page')}</span><input type="number" min={pageFrom} max={selectedUnit?.toPage || pageFrom} value={pageTo} onChange={(event) => setPageTo(Number(event.target.value))} className="h-9 w-full rounded-md border bg-background px-2 text-sm" /></label>
        </div>
      )}
      {sourceKind === 'book' && !availableBooks.length && <p role="status" className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">{copy('لا يوجد كتاب رقمي متاح لهذه المادة والصف في مكتبة المناهج الحالية. الكتب الرقمية المضافة حاليًا للصف الأول فقط، لذلك لن تُستخدم صفحات صف آخر في إنشاء الأسئلة.', 'No digital book is available for this subject and grade. The current library only has Grade 1 books, so pages from another grade will not be used.')}</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="space-y-1 text-xs"><span>{copy('نوع الأسئلة', 'Question type')}</span><select value={questionType} onChange={(event) => setQuestionType(event.target.value as typeof questionType)} className="h-9 w-full rounded-md border bg-background px-2 text-sm"><option value="mixed">{copy('متنوع', 'Mixed')}</option><option value="multiple_choice">{copy('اختيار من متعدد', 'Multiple choice')}</option><option value="true_false">{copy('صح أو خطأ', 'True or false')}</option><option value="short_answer">{copy('إجابة قصيرة', 'Short answer')}</option><option value="essay">{copy('مقالي', 'Essay')}</option></select></label>
        <label className="space-y-1 text-xs"><span>{copy('عدد الأسئلة', 'Number of questions')}</span><input type="number" min={sourceKind !== 'lesson' ? pageBatchCount : 1} max={sourceKind !== 'lesson' ? maxQuestionCount : 30} value={count} onChange={(event) => setCount(Math.max(sourceKind !== 'lesson' ? pageBatchCount : 1, Math.min(sourceKind !== 'lesson' ? maxQuestionCount : 30, Number(event.target.value))))} className="h-9 w-full rounded-md border bg-background px-2 text-sm" /></label>
        <label className="space-y-1 text-xs"><span>{copy('الصعوبة', 'Difficulty')}</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="h-9 w-full rounded-md border bg-background px-2 text-sm"><option value="EASY">{copy('سهل', 'Easy')}</option><option value="MEDIUM">{copy('متوسط', 'Medium')}</option><option value="HARD">{copy('متقدم', 'Advanced')}</option></select></label>
        <button type="button" onClick={() => void generate()} disabled={generating || extractingPdf || !subjectId || (sourceKind === 'book' && !selectedBook) || (sourceKind === 'pdf' && !pdfFile)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-50"><BookOpen className="h-4 w-4" />{generating ? <><LoaderCircle className="h-4 w-4 animate-spin" /> {copy('جارٍ الإنشاء...', 'Generating...')}</> : copy('توليد بالذكاء الاصطناعي', 'Generate with AI')}</button>
      </div>
      {sourceKind === 'book' && <p className="text-xs leading-5 text-muted-foreground">{copy('سيقرأ المساعد كل الصفحات التي اخترتها من الكتاب على دفعات من ثلاث صفحات، ويقسّم عدد الأسئلة بينها تلقائيًا. يجب أن يكون عدد الأسئلة مساويًا لعدد الدفعات على الأقل.', 'AI reads the selected book pages in batches of three and distributes the questions across them. The question count must be at least the number of batches.')}</p>}
      {sourceKind === 'pdf' && <p className="text-xs leading-5 text-muted-foreground">{copy('يُقرأ نص الملف في الذاكرة لإنشاء الأسئلة من الصفحات المحددة، ويُرفق الملف نفسه بواجب الطلاب حتى يفتحوا الصفحات المطلوبة. ملفات PDF المصوّرة التي لا تحتوي نصًا قابلًا للتحديد تحتاج نسخة نصية أو صور صفحات واضحة.', 'The selected PDF text is read in memory to create questions, and the same file is attached to the student assignment so they can open the required pages. Scanned PDFs without selectable text need a text-based copy or clear page images.')}</p>}
      {generationStatus && <p role="status" aria-live="polite" className="text-xs text-teal-800">{generationStatus}</p>}
      {sourceKind === 'lesson' && subjectLessons.length === 0 && !loadingLessons && <p className="text-xs text-amber-700">{copy('لا توجد دروس محفوظة لهذه المادة. أضف درسًا بمحتوى من صفحة التحضير أو اختر كتاب المنهج.', 'There are no saved lessons for this subject. Add lesson content from Lesson Preparation or choose a curriculum book.')}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </section>
  );
}
