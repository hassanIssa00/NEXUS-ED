'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BookMarked, Sparkles } from 'lucide-react';
import { lessonService, Lesson, CreateLessonDto } from '@/lib/services/lesson.service';
import { subjectService } from '@/lib/services/subject.service';
import { UploadResponse } from '@/lib/services/upload.service';
import FileUpload from '@/components/FileUpload';
import { curriculaList } from '@/lib/curriculaData';
import { parseClassName } from '@/lib/school-class-hierarchy';
import { useRouter } from '@/i18n/routing';

interface Subject {
    id: string;
    name: string;
    code?: string;
    class?: { id: string; name: string };
}

export default function LessonsPage() {
    const t = useTranslations('teacher');
    const isEnglish = useLocale() === 'en';
    const copy = (ar: string, en: string) => isEnglish ? en : ar;
    const router = useRouter();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [lessonsError, setLessonsError] = useState(false);
    const [subjectsError, setSubjectsError] = useState(false);
    const [curriculumSubjectId, setCurriculumSubjectId] = useState('');
    const [curriculumBookSlug, setCurriculumBookSlug] = useState('');
    const [curriculumUnitIndex, setCurriculumUnitIndex] = useState(0);
    const [curriculumPageFrom, setCurriculumPageFrom] = useState(1);
    const [curriculumPageTo, setCurriculumPageTo] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        videoUrl: '',
        subjectId: '',
        attachments: [] as string[],
    });

    const curriculumSubject = subjects.find((subject) => subject.id === curriculumSubjectId);
    const availableCurricula = useMemo(() => {
        const title = curriculumSubject?.name || '';
        const key = /قرآن|قران|مصحف/.test(title) ? 'quran'
            : /لغتي|عربي|لغة عربية/.test(title) ? 'lughati'
            : /رياض/.test(title) ? 'math'
            : /إسلام|اسلام/.test(title) ? 'islamic'
            : /علوم/.test(title) ? 'science'
            : /إنجليزي|انجليزي|إنجليزية|انجليزية|english/i.test(title) ? 'english'
            : /مهارات حياتية|حياتية وأسرية/.test(title) ? 'life-skills'
            : /فنية|فن/.test(title) ? 'art'
            : '';
        const classGrade = curriculumSubject?.class?.name ? parseClassName(curriculumSubject.class.name).grade : null;
        return curriculaList.filter((book) => book.slug === key && (!classGrade || parseClassName(book.grade).grade === classGrade));
    }, [curriculumSubject]);
    const curriculumBook = availableCurricula.find((book) => book.slug === curriculumBookSlug) || availableCurricula[0];
    const curriculumUnit = curriculumBook?.units[curriculumUnitIndex] || curriculumBook?.units[0];

    useEffect(() => {
        if (!curriculumSubjectId && subjects.length) setCurriculumSubjectId(subjects[0].id);
    }, [curriculumSubjectId, subjects]);

    useEffect(() => {
        if (!availableCurricula.length) {
            setCurriculumBookSlug('');
            return;
        }
        if (!availableCurricula.some((book) => book.slug === curriculumBookSlug)) {
            setCurriculumBookSlug(availableCurricula[0].slug);
            setCurriculumUnitIndex(0);
        }
    }, [availableCurricula, curriculumBookSlug]);

    useEffect(() => {
        if (!curriculumUnit) return;
        setCurriculumPageFrom(curriculumUnit.fromPage);
        setCurriculumPageTo(Math.min(curriculumUnit.fromPage + 2, curriculumUnit.toPage));
    }, [curriculumUnit?.fromPage, curriculumUnit?.toPage]);

    useEffect(() => {
        fetchLessons();
        fetchSubjects();
    }, []);

    const fetchLessons = async () => {
        setLoading(true);
        setLessonsError(false);
        try {
            const data = await lessonService.getMyLessons();
            setLessons(data);
        } catch (error) {
            console.error('Failed to fetch lessons', error);
            setLessonsError(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        setSubjectsError(false);
        try {
            const data = await subjectService.getAll();
            setSubjects(data);
            setCurriculumSubjectId((current) => current || data[0]?.id || '');
        } catch (error) {
            console.error('Failed to fetch subjects', error);
            setSubjectsError(true);
        }
    };

    const createAiAssignmentFromPages = () => {
        if (!curriculumSubjectId || !curriculumBook || !curriculumUnit) return;
        const query = new URLSearchParams({
            subjectId: curriculumSubjectId,
            curriculumSlug: curriculumBook.slug,
            pageFrom: String(curriculumPageFrom),
            pageTo: String(curriculumPageTo),
        });
        router.push(`/teacher/assignments/create?${query.toString()}` as never);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedLesson) {
                await lessonService.update(selectedLesson.id, formData);
            } else {
                await lessonService.create(formData as CreateLessonDto);
            }
            setIsModalOpen(false);
            resetForm();
            fetchLessons();
        } catch (error: any) {
            alert(error.message || t('saveError'));
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('confirmDelete'))) {
            try {
                await lessonService.delete(id);
                fetchLessons();
            } catch (error) {
                console.error('Failed to delete lesson', error);
                alert(t('deleteError'));
            }
        }
    };

    const handleEdit = (lesson: Lesson) => {
        setSelectedLesson(lesson);
        setFormData({
            title: lesson.title,
            content: lesson.content || '',
            videoUrl: lesson.videoUrl || '',
            subjectId: lesson.subjectId,
            attachments: lesson.attachments || [],
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setSelectedLesson(null);
        setFormData({
            title: '',
            content: '',
            videoUrl: '',
            subjectId: '',
            attachments: [],
        });
    };

    const handleFilesUploaded = (files: UploadResponse[]) => {
        const urls = files.map((f) => f.reference);
        setFormData({ ...formData, attachments: [...formData.attachments, ...urls] });
    };

    const removeAttachment = (index: number) => {
        setFormData({
            ...formData,
            attachments: formData.attachments.filter((_, i) => i !== index),
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('lessons')}</h1>
                <button
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    {t('addLesson')}
                </button>
            </div>

            <section className="mb-7 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm dark:border-teal-900 dark:from-teal-950/40 dark:to-background" aria-label={copy('إنشاء واجب من صفحات المنهج', 'Create an assignment from curriculum pages')}>
                <div className="mb-4 flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><Sparkles className="size-5" /></span>
                    <div>
                        <h2 className="font-bold text-foreground">{copy('أنشئ واجبًا من كتاب المنهج', 'Create an assignment from a curriculum book')}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{copy('اختر المادة والكتاب والدرس، وحدد صفحات الكتاب. سيقرأها الذكاء الاصطناعي ويجهز أسئلة الواجب للطلاب.', 'Choose the subject, book, and lesson, then select the pages. AI will read them and prepare assignment questions for students.')}</p>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="grid gap-1.5 text-sm font-semibold"><span>{copy('المادة والفصل', 'Subject and class')}</span><select value={curriculumSubjectId} onChange={(event) => { setCurriculumSubjectId(event.target.value); setCurriculumBookSlug(''); }} disabled={!subjects.length} className="min-h-11 rounded-lg border border-border bg-background px-3"><option value="">{subjects.length ? copy('اختر المادة', 'Select a subject') : copy('لا توجد مواد مرتبطة بالفصول', 'No subjects are linked to classes')}</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}{subject.class?.name ? ` · ${subject.class.name}` : ''}</option>)}</select></label>
                    <label className="grid gap-1.5 text-sm font-semibold"><span>{copy('كتاب المنهج', 'Curriculum book')}</span><select value={curriculumBook?.slug || ''} onChange={(event) => { setCurriculumBookSlug(event.target.value); setCurriculumUnitIndex(0); }} disabled={!availableCurricula.length} className="min-h-11 rounded-lg border border-border bg-background px-3"><option value="">{copy('لا يوجد كتاب مطابق للمادة والصف', 'No book matches this subject and grade')}</option>{availableCurricula.map((book) => <option key={book.slug} value={book.slug}>{book.title} · {book.grade}</option>)}</select></label>
                    <label className="grid gap-1.5 text-sm font-semibold"><span>{copy('الوحدة أو الدرس', 'Unit or lesson')}</span><select value={curriculumUnitIndex} onChange={(event) => setCurriculumUnitIndex(Number(event.target.value))} disabled={!curriculumBook} className="min-h-11 rounded-lg border border-border bg-background px-3">{curriculumBook?.units.map((unit, index) => <option key={`${unit.title}-${index}`} value={index}>{unit.title} · {copy('ص', 'p.')} {unit.fromPage}–{unit.toPage}</option>)}</select></label>
                    <div className="grid grid-cols-2 gap-2">
                        <label className="grid gap-1.5 text-sm font-semibold"><span>{copy('من صفحة', 'From page')}</span><input type="number" min={curriculumUnit?.fromPage || 1} max={curriculumUnit?.toPage || 1} value={curriculumPageFrom} onChange={(event) => { const next = Math.max(curriculumUnit?.fromPage || 1, Math.min(Number(event.target.value) || 1, curriculumUnit?.toPage || 1)); setCurriculumPageFrom(next); setCurriculumPageTo((current) => Math.max(next, current)); }} disabled={!curriculumUnit} className="min-h-11 w-full rounded-lg border border-border bg-background px-3" /></label>
                        <label className="grid gap-1.5 text-sm font-semibold"><span>{copy('إلى صفحة', 'To page')}</span><input type="number" min={curriculumPageFrom} max={curriculumUnit?.toPage || curriculumPageFrom} value={curriculumPageTo} onChange={(event) => setCurriculumPageTo(Math.max(curriculumPageFrom, Math.min(Number(event.target.value) || curriculumPageFrom, curriculumUnit?.toPage || curriculumPageFrom)))} disabled={!curriculumUnit} className="min-h-11 w-full rounded-lg border border-border bg-background px-3" /></label>
                    </div>
                </div>
                {!subjects.length && !subjectsError && <p className="mt-3 text-sm text-amber-800">{copy('اربط المواد بالفصول من إدارة المواد الدراسية أولًا لتظهر هنا.', 'Link subjects to classes in Subject Management to show them here.')}</p>}
                {curriculumSubject && !availableCurricula.length && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{copy('لا يوجد كتاب رقمي لهذه المادة والصف في مكتبة المناهج الحالية. المكتبة الرقمية الموجودة الآن تحتوي كتب الصف الأول فقط؛ لن أختار كتاب صف مختلف تلقائيًا.', 'There is no digital book for this subject and grade in the current curriculum library. The available digital library currently contains Grade 1 books only; a book from a different grade will not be selected automatically.')}</p>}
                {availableCurricula.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-muted-foreground"><BookMarked className="size-4" />{copy('سيُنشأ الواجب من الصفحات', 'The assignment will use pages')} {curriculumPageFrom}–{curriculumPageTo} {copy('من', 'from')} {curriculumBook?.title}.</p><button type="button" onClick={createAiAssignmentFromPages} className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900">{copy('توليد أسئلة الواجب بالذكاء الاصطناعي', 'Generate assignment questions with AI')}</button></div>}
            </section>

            {loading ? (
                <p role="status" className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
            ) : lessonsError ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                    <p>{t('loadError')}</p>
                    <button type="button" onClick={fetchLessons} className="mt-3 rounded-md bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800">
                        {t('retry')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lessons.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 col-span-full">{t('noLessons')}</p>
                    ) : (
                        lessons.map((lesson) => (
                            <div
                                key={lesson.id}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">
                                    {lesson.title}
                                </h3>
                                {lesson.subject && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                                        {lesson.subject.name}
                                    </p>
                                )}
                                {lesson.content && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                                        {lesson.content}
                                    </p>
                                )}
                                {lesson.attachments && lesson.attachments.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        <span>📎</span>
                                        <span>{lesson.attachments.length} {t('files')}</span>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(lesson)}
                                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        {t('edit')}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(lesson.id)}
                                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                                    >
                                        {t('delete')}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            {selectedLesson ? t('editLesson') : t('addLesson')}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('lessonTitle')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('subject')}
                                    </label>
                                    <select
                                        required
                                        value={formData.subjectId}
                                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">{t('selectSubject')}</option>
                                        {subjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </option>
                                        ))}
                                    </select>
                                    {subjectsError && <p role="alert" className="mt-2 text-sm text-red-600">{t('subjectsError')}</p>}
                                    {!subjectsError && subjects.length === 0 && <p className="mt-2 text-sm text-gray-500">{t('noSubjects')}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('lessonContent')}
                                    </label>
                                    <textarea
                                        rows={5}
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('videoUrl')} ({t('optional')})
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.videoUrl}
                                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('attachments')}
                                    </label>
                                    <FileUpload onUploadComplete={handleFilesUploaded} />
                                    {formData.attachments.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t('uploadedFiles')}:
                                            </p>
                                            <div className="space-y-2">
                                                {formData.attachments.map((url, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                                                    >
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                            {url.startsWith('file:') ? `${t('files')} ${index + 1}` : url.split('/').pop()}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAttachment(index)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {t('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
