'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, AlertCircle, Upload, Save, X, FileText, CheckCircle2, Loader2, BookOpen } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import CurriculumInteractiveWorkbook from '@/components/CurriculumInteractiveWorkbook';
import { getCurriculumBySlug } from '@/lib/curriculaData';
import { clearCurriculumDrawings, createSolvedCurriculumPageFiles, getMissingCurriculumDrawingPages } from '@/lib/curriculum-workbook';

interface Assignment {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    maxScore: number;
    deliveryMode?: 'AI_QUESTIONS' | 'BOOK_PAGES';
    curriculumSlug?: string | null;
    curriculumPageFrom?: number | null;
    curriculumPageTo?: number | null;
    attachments?: string[];
    subject: { name: string };
    questions?: Array<{
        id: string;
        prompt: string;
        type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
        points: number;
        options?: string[];
    }>;
}

const MAX_FILE_SIZE_MB = 15;
const MAX_SUBMISSION_FILES = 30;
const BOOK_PAGE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'video/mp4', 'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function SubmitAssignmentPage() {
    const router = useRouter();
    const locale = useLocale() === 'en' ? 'en' : 'ar';
    const isEnglish = locale === 'en';
    const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish]);
    const searchParams = useSearchParams();
    const assignmentId = searchParams.get('id');
    const { toast } = useToast();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [comments, setComments] = useState('');
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!assignmentId) {
            router.push('/student/assignments');
            return;
        }

        const fetchAssignment = async () => {
            try {
                const res = await apiClient.get(`/assignments/${assignmentId}`);
                setAssignment(res.data?.data || res.data);
            } catch (error) {
                console.error(error);
                toast({ title: t('خطأ', 'Error'), description: t('تعذر تحميل الواجب', 'Could not load the assignment'), variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        fetchAssignment();
    }, [assignmentId, router, toast, t]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        const validFiles: File[] = [];

        for (const f of newFiles) {
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                toast({ title: isEnglish ? `File ${f.name} is too large` : `الملف ${f.name} كبير جداً`, description: isEnglish ? `Maximum size: ${MAX_FILE_SIZE_MB} MB` : `الحد الأقصى ${MAX_FILE_SIZE_MB} ميجابايت`, variant: 'destructive' });
                continue;
            }
            if (!ALLOWED_TYPES.includes(f.type)) {
                toast({ title: isEnglish ? `File type not allowed: ${f.name}` : `نوع الملف ${f.name} غير مسموح به`, description: t('الأنواع المسموحة: صور، PDF، فيديو، Word', 'Allowed types: images, PDF, video, and Word'), variant: 'destructive' });
                continue;
            }
            if (assignment?.deliveryMode === 'BOOK_PAGES' && !BOOK_PAGE_IMAGE_TYPES.has(f.type.toLowerCase())) {
                toast({ title: isEnglish ? `File ${f.name} is not an image` : `الملف ${f.name} ليس صورة`, description: t('واجب صفحات الكتاب يحتاج صورًا واضحة للحل بصيغة JPG أو PNG أو WebP حتى يتمكن الذكاء الاصطناعي من قراءتها.', 'Book-page assignments require clear JPG, PNG, or WebP images so the AI can read the work.'), variant: 'destructive' });
                continue;
            }
            validFiles.push(f);
        }

        setFiles(prev => [...prev, ...validFiles].slice(0, MAX_SUBMISSION_FILES));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const questions = assignment?.questions || [];
        const isBookPages = assignment?.deliveryMode === 'BOOK_PAGES';
        const unanswered = questions.filter((question) => !answers[question.id]?.trim());
        if (unanswered.length > 0) {
            toast({ title: t('إجابات غير مكتملة', 'Unanswered questions'), description: isEnglish ? `Answer the remaining questions (${unanswered.length}) before submitting.` : `أجب عن الأسئلة المتبقية (${unanswered.length}) قبل التسليم.`, variant: 'destructive' });
            return;
        }
        if (!isBookPages && files.length === 0 && !comments.trim() && questions.length === 0) {
            toast({ title: t('خطأ', 'Error'), description: t('الرجاء إرفاق ملف أو كتابة إجابة', 'Attach a file or enter an answer.'), variant: 'destructive' });
            return;
        }
        if (isBookPages) {
            const slug = assignment?.curriculumSlug;
            const from = assignment?.curriculumPageFrom;
            const to = assignment?.curriculumPageTo;
            if (!slug || slug === 'uploaded-book' || !from || !to || !getCurriculumBySlug(slug)) {
                toast({ title: t('صفحات الكتاب غير متاحة', 'Book pages unavailable'), description: t('تعذر فتح نسخة الكتاب الرقمية لهذا الواجب. أبلغ المعلم ليراجع إعداداته.', 'The digital book for this assignment could not be opened. Ask the teacher to check the assignment settings.'), variant: 'destructive' });
                return;
            }
            const missingPages = getMissingCurriculumDrawingPages(slug, from, to, assignment?.id);
            if (missingPages.length) {
                const preview = missingPages.slice(0, 8).join(isEnglish ? ', ' : '، ');
                toast({ title: t('أكمل حل صفحات الكتاب', 'Finish the book pages'), description: isEnglish ? `Write on every page before submitting. Pages without saved work: ${preview}${missingPages.length > 8 ? '…' : ''}` : `اكتب الحل على كل صفحة بالقلم قبل الإرسال. الصفحات التي لم تحفظ عليها كتابة: ${preview}${missingPages.length > 8 ? '…' : ''}`, variant: 'destructive' });
                return;
            }
        }
        if (assignment?.deliveryMode === 'AI_QUESTIONS' && !questions.length) {
            toast({ title: t('الواجب غير مكتمل', 'Assignment is incomplete'), description: t('لم تصل أسئلة هذا الواجب. أبلغ المعلم لإعادة إسناده بالأسئلة المطلوبة.', 'This assignment has no questions. Ask the teacher to regenerate and reassign it.'), variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        setUploadProgress(0);

        try {
            const fileUrls: string[] = [];
            let submissionFiles = files;

            if (isBookPages && assignment?.curriculumSlug && assignment.curriculumPageFrom && assignment.curriculumPageTo) {
                setUploadProgress(5);
                submissionFiles = await createSolvedCurriculumPageFiles(
                    assignment.curriculumSlug,
                    assignment.curriculumPageFrom,
                    assignment.curriculumPageTo,
                    assignment.id,
                );
            }

            // Book-page answers are composed from the selected book pages and the student's saved ink.
            for (let i = 0; i < submissionFiles.length; i++) {
                const formData = new FormData();
                formData.append('file', submissionFiles[i]);
                const uploadRes = await apiClient.post('/upload/file', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (uploadRes.data?.url) {
                    fileUrls.push(uploadRes.data.reference);
                }
                setUploadProgress(5 + Math.round(((i + 1) / (submissionFiles.length || 1)) * 70));
            }

            setUploadProgress(85);

            await apiClient.post(`/assignments/${assignmentId}/submit`, {
                content: questions.length
                    ? JSON.stringify({
                        kind: 'nexus-assignment-answers',
                        answers,
                        questions: questions.map(({ id, prompt }) => ({ id, prompt })),
                        comments: comments.trim(),
                    })
                    : comments,
                attachments: fileUrls,
            });

            setUploadProgress(100);
            setUploadedUrls(fileUrls);
            if (isBookPages && assignment?.curriculumSlug && assignment.curriculumPageFrom && assignment.curriculumPageTo) {
                clearCurriculumDrawings(assignment.curriculumSlug, assignment.curriculumPageFrom, assignment.curriculumPageTo, assignment.id);
            }

            toast({
                title: t('✅ تم التسليم بنجاح!', '✅ Submitted successfully!'),
                description: isBookPages ? t('تم إرسال صفحات الكتاب وإجاباتك من المنصة، وسيصححها الذكاء الاصطناعي.', 'Your completed book pages and answers were submitted. The AI will grade them.') : t('تم إرسال إجابتك. ستظهر الدرجة بعد مراجعة المعلم.', 'Your answer was submitted. The score will appear after the teacher reviews it.'),
            });

            setTimeout(() => router.push('/student/assignments'), 1500);

        } catch (error: any) {
            toast({
                title: t('حدث خطأ', 'Something went wrong'),
                description: isEnglish ? 'Assignment submission failed. Check your connection and try again.' : (error.response?.data?.message || 'فشل في تسليم الواجب. تحقق من اتصالك.'),
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64" dir={isEnglish ? 'ltr' : 'rtl'}>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!assignment) {
        return <div className="text-center py-10 text-red-500" dir={isEnglish ? 'ltr' : 'rtl'}>{t('الواجب غير موجود', 'Assignment not found')}</div>;
    }

    let daysRemaining = 0;
    if (assignment.dueDate) {
        const diff = new Date(assignment.dueDate).getTime() - new Date().getTime();
        daysRemaining = Math.ceil(diff / (1000 * 3600 * 24));
    }
    const missingAiQuestions = assignment.deliveryMode === 'AI_QUESTIONS' && !(assignment.questions?.length);
    const bookCurriculum = assignment.curriculumSlug && assignment.curriculumSlug !== 'uploaded-book'
        ? getCurriculumBySlug(assignment.curriculumSlug)
        : undefined;
    const hasBookPageRange = Boolean(assignment.curriculumPageFrom && assignment.curriculumPageTo);

    return (
        <div className="max-w-4xl space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div>
                <h1 className="text-3xl font-bold">{assignment.deliveryMode === 'BOOK_PAGES' ? t('حل واجب صفحات الكتاب', 'Complete the book-page assignment') : t('حل أسئلة الواجب', 'Answer the assignment questions')}</h1>
                <p className="text-muted-foreground mt-2">{assignment.deliveryMode === 'BOOK_PAGES' ? t('صفحات الكتاب موجودة هنا. اكتب إجاباتك بالقلم على الصفحات، ثم أرسل الواجب من المنصة.', 'The assigned book pages are below. Write on each page, then submit your work from the platform.') : t('أجب عن أسئلة الواجب هنا؛ تُرسل إجاباتك للتصحيح بعد التسليم.', 'Answer the questions here. Your answers will be sent for grading when you submit.')}</p>
            </div>

            {/* Assignment Details */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{assignment.title}</CardTitle>
                        <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                            {assignment.maxScore} {t('درجة', 'points')}
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {t('تاريخ التسليم:', 'Due date:')} {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA') : t('غير محدد', 'Not set')}
                        </div>
                        <div className={`flex items-center gap-2 ${daysRemaining <= 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            <Clock className="w-4 h-4" />
                            {daysRemaining > 0 ? (isEnglish ? `${daysRemaining} days remaining` : `${daysRemaining} أيام متبقية`) : t('انتهى الوقت', 'Past due')}
                        </div>
                    </div>
                    {assignment.description && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
                        </div>
                    )}
                    {assignment.curriculumSlug === 'uploaded-book' && assignment.curriculumPageFrom && assignment.curriculumPageTo && assignment.attachments?.[0] && <a href={`${assignment.attachments[0]}#page=${assignment.curriculumPageFrom}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800">
                        <BookOpen className="size-4" />{t('فتح الكتاب المرفق · الصفحات', 'Open attached book · pages')} {assignment.curriculumPageFrom}–{assignment.curriculumPageTo}
                    </a>}
                    {assignment.deliveryMode === 'BOOK_PAGES' && hasBookPageRange && <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-900"><BookOpen className="size-4" />{t('صفحات الواجب', 'Assignment pages')} {assignment.curriculumPageFrom}–{assignment.curriculumPageTo} {t('معروضة أسفل التفاصيل', 'are shown below')}</p>}
                    {daysRemaining <= 0 && assignment.dueDate && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                {t('لقد تجاوزت موعد التسليم. قد يتم خصم درجات من قِبل المعلم.', 'The due date has passed. The teacher may apply a late penalty.')}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {assignment.deliveryMode === 'BOOK_PAGES' && bookCurriculum && hasBookPageRange && <section className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-3 sm:p-5">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold">{t('حلّ على صفحات الكتاب', 'Write on the book pages')}</h2>
                    <p className="text-sm text-muted-foreground">{t('استخدم القلم للتدوين مباشرة فوق كل صفحة. تُحفظ كتابتك تلقائيًا، ثم يرسل زر التسليم الصفحات وإجاباتك للمعلم.', 'Use the pen to write on each page. Your work is saved automatically, then the submit button sends the pages and answers to the teacher.')}</p>
                </div>
                <CurriculumInteractiveWorkbook
                    curriculum={bookCurriculum}
                    assignmentRange={{ from: assignment.curriculumPageFrom!, to: assignment.curriculumPageTo! }}
                    studentAssignmentMode
                    drawingScope={assignment.id}
                />
            </section>}

            {assignment.deliveryMode === 'BOOK_PAGES' && !bookCurriculum && <Card className="border-rose-200 bg-rose-50"><CardContent className="p-5 text-sm text-rose-800">{t('نسخة صفحات الكتاب غير متاحة في المنصة لهذا الواجب. أبلغ المعلم ليربطه بكتاب المنهج الصحيح.', 'The book pages are unavailable for this assignment. Ask the teacher to link the correct curriculum book.')}</CardContent></Card>}

            {/* Submission Form */}
            {missingAiQuestions ? (
                <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20">
                    <CardContent className="space-y-2 p-6 text-center">
                        <AlertCircle className="mx-auto size-8 text-rose-600" />
                        <h2 className="font-bold text-rose-900 dark:text-rose-200">{t('أسئلة هذا الواجب لم تصل', 'Assignment questions are missing')}</h2>
                        <p className="text-sm text-rose-800 dark:text-rose-300">{t('هذا الواجب محدد على أنه واجب أسئلة، لكن لا توجد أسئلة محفوظة لعرضها. أبلغ المعلم ليعيد إسناده بعد توليد الأسئلة.', 'This is a question-based assignment, but it has no saved questions. Ask the teacher to generate the questions and assign it again.')}</p>
                    </CardContent>
                </Card>
            ) : <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>{assignment.questions?.length ? `${t('أسئلة الواجب', 'Assignment questions')} (${assignment.questions.length})` : assignment.deliveryMode === 'BOOK_PAGES' ? t('إرسال الحل المكتوب على صفحات الكتاب', 'Submit your written book-page work') : t('إجابتك', 'Your answer')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {assignment.questions?.map((question, index) => (
                            <fieldset key={question.id} className="space-y-3 rounded-lg border p-4" disabled={submitting}>
                                <legend className="px-1 text-sm font-semibold">{t('السؤال', 'Question')} {index + 1}</legend>
                                <p className="text-sm leading-6">{question.prompt}</p>
                                {question.type === 'multiple_choice' || question.type === 'true_false' ? (
                                    <div className="space-y-2">
                                        {(question.options || []).map((option, optionIndex) => (
                                            <label key={`${question.id}-${optionIndex}`} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                                                <input type="radio" name={`answer-${question.id}`} value={option} checked={answers[question.id] === option} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} />
                                                <span>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <Textarea rows={question.type === 'essay' ? 5 : 2} value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={question.type === 'essay' ? t('اكتب إجابتك بالتفصيل...', 'Write your answer in detail…') : t('اكتب إجابة قصيرة...', 'Write a short answer…')} />
                                )}
                            </fieldset>
                        ))}
                        {/* Text Answer */}
                        <div className="space-y-2">
                            <Label htmlFor="comments">{assignment.questions?.length || assignment.deliveryMode === 'BOOK_PAGES' ? t('ملاحظة إضافية للمعلم (اختياري)', 'Additional note for the teacher (optional)') : t('إجابة نصية / ملاحظات للمعلم', 'Written answer / note for the teacher')}</Label>
                            <Textarea
                                id="comments"
                                placeholder={assignment.deliveryMode === 'BOOK_PAGES' ? t('أي ملاحظة للمعلم (اختياري)...', 'Add a note for the teacher (optional)…') : t('اكتب إجابتك هنا، أو اترك أي ملاحظة للمعلم إذا أرفقت ملفاً...', 'Write your answer here, or leave a note for the teacher if you attached a file…')}
                                rows={5}
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        {/* File Upload */}
                        {assignment.deliveryMode === 'BOOK_PAGES' ? <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-900">
                            {t('لن تحتاج إلى رفع صور. عند الضغط على «إرسال الواجب» ستُرسل صفحات الكتاب التي كتبت عليها من داخل المنصة مباشرة.', 'You do not need to upload photos. Selecting “Submit assignment” sends the book pages you completed in the platform.')}
                        </div> : <div className="space-y-3">
                            <Label>{t('المرفقات (صور، PDF، مستندات — حتى', 'Attachments (images, PDF, documents — up to')} {MAX_SUBMISSION_FILES} {t('ملفًا)', 'files)')}</Label>

                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.mp4,.webm,.doc,.docx"
                                multiple
                                disabled={submitting}
                            />

                            {/* Drop Zone */}
                            <div
                                onClick={() => !submitting && fileInputRef.current?.click()}
                                className="border-2 border-dashed border-primary/30 rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-primary/5 hover:border-primary/60 transition-all cursor-pointer group"
                            >
                                <Upload className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform text-primary/60" />
                                <p className="text-sm font-medium">{t('اضغط لرفع ملف أو أكثر', 'Select one or more files to upload')}</p>
                                <p className="text-xs mt-1">{t('صور، PDF، فيديو، Word — حتى', 'Images, PDF, video, Word — up to')} {MAX_FILE_SIZE_MB} {t('ميجابايت لكل ملف', 'MB per file')}</p>
                            </div>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    {files.map((f, i) => {
                                        const isImage = f.type.startsWith('image/');
                                        return (
                                            <div key={i} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {isImage ? (
                                                        <img
                                                            src={URL.createObjectURL(f)}
                                                            alt={f.name}
                                                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                            <FileText className="w-5 h-5 text-primary" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate" dir="ltr">{f.name}</p>
                                                        <p className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                {!submitting && (
                                                    <Button variant="ghost" size="sm" type="button" onClick={() => removeFile(i)}>
                                                        <X className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>}

                        {/* Upload Progress */}
                        {submitting && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {assignment.deliveryMode === 'BOOK_PAGES' && uploadProgress < 80 ? t('جاري تجهيز صفحات الحل وإرسالها...', 'Preparing and sending your completed pages…') : uploadProgress < 80 ? t('جاري رفع الملفات...', 'Uploading files…') : uploadProgress < 100 ? t('جاري التسليم...', 'Submitting…') : t('تم!', 'Done!')}
                                    </span>
                                    <span className="font-bold text-primary">{uploadProgress}%</span>
                                </div>
                                <Progress value={uploadProgress} className="h-2" />
                            </div>
                        )}

                        {/* Submit Buttons */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={submitting}
                            >
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || (!assignment.questions?.length && assignment.deliveryMode !== 'BOOK_PAGES' && files.length === 0 && !comments.trim())}
                                className="gap-2 min-w-32"
                            >
                                {submitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('جاري الإرسال...', 'Submitting…')}</>
                                ) : (
                                    <><Save className="w-4 h-4" /> {t('تسليم الواجب', 'Submit assignment')}</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>}
        </div>
    );
}
