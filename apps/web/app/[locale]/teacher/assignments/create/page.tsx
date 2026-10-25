'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, Upload, Save, X, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api/client'
import { useRouter } from '@/i18n/routing'
import { AiQuestionBuilder, type GeneratedSource, type TeacherQuestion } from '@/components/teacher/AiQuestionBuilder'
import { useSearchParams } from 'next/navigation'
import { curriculaList } from '@/lib/curriculaData'
import { useLocale } from 'next-intl'

interface Subject {
    id: string;
    name: string;
    class?: { id: string; name: string };
}

export default function CreateAssignmentPage() {
    const isEnglish = useLocale() === 'en'
    const t = (ar: string, en: string) => isEnglish ? en : ar
    const { toast } = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()
    const curriculumSlug = searchParams.get('curriculumSlug') || ''
    const curriculumPageFrom = Number(searchParams.get('pageFrom')) || undefined
    const curriculumPageTo = Number(searchParams.get('pageTo')) || undefined
    const presetCurriculum = curriculaList.find((book) => book.slug === curriculumSlug)
    const initialAssignmentMode = searchParams.get('assignmentMode') === 'BOOK_PAGES' ? 'BOOK_PAGES' : 'AI_QUESTIONS'
    
    const [title, setTitle] = useState(() => presetCurriculum && curriculumPageFrom && curriculumPageTo ? (isEnglish ? `Assignment: ${presetCurriculum.title} · pages ${curriculumPageFrom}–${curriculumPageTo}` : `واجب ${presetCurriculum.title} · الصفحات ${curriculumPageFrom}–${curriculumPageTo}`) : '')
    const [description, setDescription] = useState(() => presetCurriculum && curriculumPageFrom && curriculumPageTo
        ? initialAssignmentMode === 'BOOK_PAGES'
            ? (isEnglish ? `Complete textbook pages ${curriculumPageFrom}–${curriculumPageTo} in the platform, then submit your work to the teacher.` : `حل صفحات كتاب ${presetCurriculum.title} من الصفحة ${curriculumPageFrom} إلى الصفحة ${curriculumPageTo} مباشرة في المنصة، ثم أرسل الحل للمعلم.`)
            : (isEnglish ? `Answer the questions from textbook pages ${curriculumPageFrom}–${curriculumPageTo}, then submit your answers.` : `أجب عن أسئلة كتاب ${presetCurriculum.title} من الصفحة ${curriculumPageFrom} إلى الصفحة ${curriculumPageTo} ثم أرسل إجاباتك.`)
        : '')
    const [subjectId, setSubjectId] = useState(() => searchParams.get('subjectId') || '')
    const [date, setDate] = useState<Date>()
    const [maxScore, setMaxScore] = useState('10')
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [questions, setQuestions] = useState<TeacherQuestion[]>([])
    const [assignmentMode, setAssignmentMode] = useState<'AI_QUESTIONS' | 'BOOK_PAGES'>(initialAssignmentMode)
    const [generatedPdfSource, setGeneratedPdfSource] = useState<GeneratedSource | null>(null)
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loadingSubjects, setLoadingSubjects] = useState(true)
    const [subjectsError, setSubjectsError] = useState('')
    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const assignmentCurriculumSlug = generatedPdfSource ? 'uploaded-book' : curriculumSlug
    const assignmentPageFrom = generatedPdfSource?.pageFrom ?? curriculumPageFrom
    const assignmentPageTo = generatedPdfSource?.pageTo ?? curriculumPageTo

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await apiClient.get('/subjects/teacher/my');
                setSubjects(Array.isArray(res.data) ? res.data : []);
                if (!Array.isArray(res.data) || res.data.length === 0) setSubjectsError(t('لا توجد مواد مرتبطة بحسابك.', 'No subjects are linked to your account.'));
            } catch (err) {
                setSubjectsError(t('تعذر تحميل المواد من النظام.', 'Could not load subjects from the system.'));
            } finally {
                setLoadingSubjects(false);
            }
        };
        fetchSubjects();
    }, [isEnglish])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast({ title: t('حجم الملف كبير جدًا', 'File is too large'), description: t('يجب أن يكون أقل من 10MB', 'The file must be smaller than 10 MB.'), variant: 'destructive' });
                return;
            }
            setFile(selectedFile);
        }
    }

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!title || !subjectId) {
            toast({ title: t('خطأ', 'Error'), description: t('يرجى إدخال العنوان والمادة', 'Enter an assignment title and select a subject.'), variant: 'destructive' })
            return
        }
        if (assignmentMode === 'BOOK_PAGES' && (!curriculumSlug || !curriculumPageFrom || !curriculumPageTo)) {
            toast({ title: t('اختر صفحات من كتاب المنهج', 'Select textbook pages'), description: t('ارجع إلى الكتاب وحدد الصفحات أولًا قبل إنشاء واجب الصفحات.', 'Return to the textbook and select a page range before creating a book-pages assignment.'), variant: 'destructive' })
            return
        }
        if (assignmentMode === 'AI_QUESTIONS' && questions.length === 0) {
            toast({ title: t('ولّد أسئلة الواجب أولًا', 'Generate the assignment questions first'), description: t('لن يُنشر واجب الذكاء الاصطناعي قبل حفظ أسئلته للطلاب.', 'An AI assignment cannot be published until its questions have been saved for students.'), variant: 'destructive' })
            return
        }
        if (assignmentMode === 'AI_QUESTIONS' && assignmentCurriculumSlug && (!assignmentPageFrom || !assignmentPageTo || assignmentPageTo < assignmentPageFrom)) {
            toast({ title: t('أكمل واجب صفحات الكتاب', 'Complete the textbook assignment setup'), description: t('ولّد أسئلة من صفحات الكتاب قبل نشر الواجب حتى يتمكن النظام من تصحيح الإجابات تلقائيًا.', 'Generate questions from the textbook pages before publishing so the system can grade answers automatically.'), variant: 'destructive' })
            return
        }

        setLoading(true)
        
        try {
            let uploadedFileUrls: string[] = [];

            // Keep the textbook PDF first so students can open its assigned page range.
            for (const sourceFile of [generatedPdfSource?.file, file].filter((item): item is File => Boolean(item))) {
                const formData = new FormData();
                formData.append('file', sourceFile);
                const uploadRes = await apiClient.post('/upload/file', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data && uploadRes.data.url) {
                    uploadedFileUrls.push(uploadRes.data.reference);
                }
            }

            // 2. Create Assignment
            const assignmentData = {
                title,
                description,
                subjectId,
                dueDate: date ? date.toISOString() : undefined,
                maxScore: Number(maxScore),
                attachments: uploadedFileUrls,
                questions: assignmentMode === 'AI_QUESTIONS' && questions.length ? questions : undefined,
                deliveryMode: assignmentMode,
                curriculumSlug: assignmentCurriculumSlug || undefined,
                curriculumPageFrom: assignmentPageFrom,
                curriculumPageTo: assignmentPageTo,
            };

            await apiClient.post('/assignments', assignmentData);

            toast({
                title: t('تم إنشاء الواجب بنجاح ✅', 'Assignment created successfully ✅'),
                description: t('تم رفع الواجب وإشعار الطلاب.', 'The assignment was published and students were notified.'),
            })

            router.push('/teacher/assignments')
            
        } catch (error: any) {
            toast({
                title: t('حدث خطأ', 'An error occurred'),
                description: error.response?.data?.message || t('فشل في إنشاء الواجب', 'Could not create the assignment.'),
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t('إنشاء واجب جديد 📝', 'Create a new assignment 📝')}</h2>
                <p className="text-muted-foreground">{t('إضافة واجب أو اختبار جديد ورفعه للطلاب', 'Create and publish a new assignment or test for students.')}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('تفاصيل الواجب', 'Assignment details')}</CardTitle>
                    <CardDescription>{t('أدخل المعلومات الأساسية وأرفق الملف المطلوب', 'Enter the basic information and attach any required file.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>{t('عنوان الواجب', 'Assignment title')}</Label>
                                <Input 
                                    placeholder={t('مثال: حل تمارين الجمع والطرح', 'e.g. Complete the addition and subtraction exercises')}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('المادة', 'Subject')}</Label>
                                <Select value={subjectId} onValueChange={setSubjectId} required disabled={loadingSubjects || subjects.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر المادة', 'Select a subject')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(sub => (
                                            <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {subjectsError && <p className="text-sm text-destructive">{subjectsError}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('الوصف والتعليمات', 'Description and instructions')}</Label>
                            <Textarea
                                placeholder={t('اكتب تعليمات الواجب ومعايير التصحيح هنا...', 'Enter assignment instructions and grading criteria...')}
                                className="min-h-[160px]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <section className="space-y-3 rounded-xl border bg-muted/20 p-4" aria-labelledby="assignment-work-mode">
                            <div><h3 id="assignment-work-mode" className="font-bold">{t('طريقة حل الطالب', 'Student work format')}</h3><p className="text-sm text-muted-foreground">{t('اختر بين اختبار إلكتروني بأسئلة مولّدة أو إرسال صفحات الكتاب نفسها.', 'Choose an online quiz with generated questions or assign textbook pages.')}</p></div>
                            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('طريقة حل الواجب', 'Assignment work format')}>
                                <button type="button" role="radio" aria-checked={assignmentMode === 'AI_QUESTIONS'} onClick={() => { setAssignmentMode('AI_QUESTIONS'); setDescription((current) => current.startsWith('حل صفحات كتاب ') ? (isEnglish ? `Answer the questions from textbook pages ${curriculumPageFrom}–${curriculumPageTo}, then submit your answers.` : `أجب عن أسئلة كتاب ${presetCurriculum?.title || 'المنهج'} من الصفحة ${curriculumPageFrom} إلى الصفحة ${curriculumPageTo} ثم أرسل إجاباتك.`) : current); }} className={`rounded-lg border p-3 text-start ${assignmentMode === 'AI_QUESTIONS' ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100' : 'bg-background hover:border-teal-300'}`}><strong className="block text-sm">{t('أسئلة بالذكاء الاصطناعي', 'AI-generated questions')}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{t('توليد أسئلة من الدرس أو صفحات الكتاب، ثم إجابات إلكترونية وتصحيح آلي.', 'Generate questions from a lesson or textbook pages, then collect online answers and grade them automatically.')}</span></button>
                                <button type="button" role="radio" aria-checked={assignmentMode === 'BOOK_PAGES'} disabled={!curriculumSlug || !curriculumPageFrom || !curriculumPageTo} onClick={() => { setAssignmentMode('BOOK_PAGES'); setDescription((current) => !current || current.startsWith('أجب عن أسئلة كتاب ') ? (isEnglish ? `Complete textbook pages ${curriculumPageFrom}–${curriculumPageTo} in the platform, then submit your work to the teacher.` : `حل صفحات كتاب ${presetCurriculum?.title || 'المنهج'} من الصفحة ${curriculumPageFrom} إلى الصفحة ${curriculumPageTo} مباشرة في المنصة، ثم أرسل الحل للمعلم.`) : current); }} className={`rounded-lg border p-3 text-start disabled:cursor-not-allowed disabled:opacity-50 ${assignmentMode === 'BOOK_PAGES' ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100' : 'bg-background hover:border-teal-300'}`}><strong className="block text-sm">{t('صفحات الكتاب نفسها', 'Textbook pages')}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{t('تظهر الصفحات المحددة للطالب هنا، ويكتب إجاباته عليها ثم يرسلها مباشرة؛ دون رفع ملفات.', 'The selected pages appear here for students to complete and submit in the platform. No file upload is required.')}</span></button>
                            </div>
                        </section>

                        {assignmentMode === 'AI_QUESTIONS' ? <AiQuestionBuilder
                            subjectId={subjectId}
                            subjectName={subjects.find((subject) => subject.id === subjectId)?.name}
                            subjectClassName={subjects.find((subject) => subject.id === subjectId)?.class?.name}
                            initialBookSlug={curriculumSlug || undefined}
                            initialPageFrom={curriculumPageFrom}
                            initialPageTo={curriculumPageTo}
                            onGenerated={(generatedQuestions, source) => {
                                setQuestions(generatedQuestions)
                                setGeneratedPdfSource(source?.kind === 'uploaded-pdf' ? source : null)
                                if (source?.kind === 'uploaded-pdf') {
                                    setTitle((current) => current || (isEnglish ? `Assignment: ${subjects.find((subject) => subject.id === subjectId)?.name || ''} · pages ${source.pageFrom}–${source.pageTo}` : `واجب ${subjects.find((subject) => subject.id === subjectId)?.name || ''} · صفحات ${source.pageFrom}–${source.pageTo}`))
                                    setDescription((current) => current || t(`أجب عن الأسئلة بعد مراجعة صفحات ${source.pageFrom}–${source.pageTo} من ملف الكتاب المرفق.`, `Answer the questions after reviewing pages ${source.pageFrom}–${source.pageTo} of the attached textbook.`))
                                }
                            }}
                        /> : <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">
                            <strong className="block">{t('واجب صفحات الكتاب:', 'Textbook pages assignment:')} {presetCurriculum?.title || t('الكتاب المحدد', 'Selected book')} · {t('ص', 'pp.')} {curriculumPageFrom}–{curriculumPageTo}</strong>
                            <span>{t('ستظهر الصفحات المحددة داخل صفحة الواجب. يكتب الطالب الحل بالقلم على الصفحات، ثم يضغط إرسال؛ وتصل صور الكتابة للمعلم ويصححها الذكاء الاصطناعي.', 'The selected pages will appear in the assignment. Students write on the pages using the on-screen pen and submit; their work is sent to the teacher for AI-assisted grading.')}</span>
                        </div>}

                        {questions.length > 0 && (
                            <section className="space-y-3 rounded-md border p-4" aria-label={t('أسئلة الواجب', 'Assignment questions')}>
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-semibold">{t('أسئلة الواجب', 'Assignment questions')} ({questions.length})</h3>
                                    <button type="button" onClick={() => { setQuestions([]); setGeneratedPdfSource(null) }} className="text-xs text-red-700 hover:underline">{t('حذف كل الأسئلة', 'Delete all questions')}</button>
                                </div>
                                {questions.map((question, index) => (
                                    <article key={question.id} className="flex items-start justify-between gap-3 rounded-md bg-muted/40 p-3">
                                        <div className="min-w-0 space-y-1 text-sm">
                                            <p className="font-medium">{index + 1}. {question.prompt}</p>
                                            {question.type === 'multiple_choice' && <p className="text-xs text-muted-foreground">{question.options.map((option) => `${option.correct ? '✓ ' : ''}${option.text}`).join(' · ')}</p>}
                                            {question.type !== 'essay' && <p className="text-xs text-teal-800 dark:text-teal-300">{t('الإجابة النموذجية:', 'Correct answer:')} {question.correctAnswer === 'true' ? t('صح', 'True') : question.correctAnswer === 'false' ? t('خطأ', 'False') : question.correctAnswer}</p>}
                                        </div>
                                        <button type="button" onClick={() => setQuestions((items) => items.filter((item) => item.id !== question.id))} className="grid size-8 shrink-0 place-items-center rounded border text-red-700" aria-label={`${t('حذف السؤال', 'Delete question')} ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
                                    </article>
                                ))}
                            </section>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>{t('تاريخ التسليم', 'Due date')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP", { locale: isEnglish ? enUS : arSA }) : <span>{t('اختر التاريخ (اختياري)', 'Choose a date (optional)')}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                            dir={isEnglish ? 'ltr' : 'rtl'}
                                            locale={isEnglish ? enUS : arSA}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('الدرجة الكلية', 'Maximum score')}</Label>
                                <Input 
                                    type="number" 
                                    placeholder="10" 
                                    min="1" 
                                    value={maxScore}
                                    onChange={(e) => setMaxScore(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('المرفقات (PDF، صورة، فيديو)', 'Attachments (PDF, image, video)')}</Label>
                            
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileChange}
                                accept=".pdf,.webp,.webp,.webp,.mp4,.webm,.doc,.docx"
                            />

                            {!file ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                >
                                    <Upload className="h-8 w-8 mb-2" />
                                    <p className="text-sm">{t('اضغط للرفع أو اسحب الملفات هنا', 'Click to upload or drag files here')}</p>
                                    <p className="text-xs mt-1">PDF, DOCX, PNG (Max 10 MB)</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <div className="flex items-center space-x-3 space-x-reverse">
                                        <div className="bg-primary/10 p-2 rounded-md">
                                            <Upload className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={removeFile} type="button">
                                        <X className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" type="button" onClick={() => router.back()}>{t('إلغاء', 'Cancel')}</Button>
                            <Button type="submit" disabled={loading} className="gap-2">
                                <Save className="w-4 h-4" />
                                {loading ? t('جارٍ الرفع والحفظ...', 'Uploading and saving...') : t('نشر الواجب للطلاب', 'Publish assignment to students')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
