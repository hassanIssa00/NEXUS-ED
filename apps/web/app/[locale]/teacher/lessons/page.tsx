'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { lessonService, Lesson, CreateLessonDto } from '@/lib/services/lesson.service';
import { subjectService } from '@/lib/services/subject.service';
import { UploadResponse } from '@/lib/services/upload.service';
import FileUpload from '@/components/FileUpload';

interface Subject {
    id: string;
    name: string;
    code?: string;
}

export default function LessonsPage() {
    const t = useTranslations('teacher');
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        videoUrl: '',
        subjectId: '',
        attachments: [] as string[],
    });

    useEffect(() => {
        fetchLessons();
        fetchSubjects();
    }, []);

    const fetchLessons = async () => {
        setLoading(true);
        try {
            const data = await lessonService.getMyLessons();
            setLessons(data);
        } catch (error) {
            console.error('Failed to fetch lessons', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const data = await subjectService.getAll();
            setSubjects(data);
        } catch (error) {
            console.error('Failed to fetch subjects', error);
        }
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
            alert(error.message || 'Failed to save lesson');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('confirmDelete'))) {
            try {
                await lessonService.delete(id);
                fetchLessons();
            } catch (error) {
                console.error('Failed to delete lesson', error);
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

            {loading ? (
                <div>Loading...</div>
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
