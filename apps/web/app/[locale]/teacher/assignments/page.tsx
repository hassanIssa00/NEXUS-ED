'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { assignmentService, Assignment, CreateAssignmentDto } from '@/lib/services/assignment.service';
import { apiClient } from '@/lib/api/client';
import { UploadResponse } from '@/lib/services/upload.service';
import FileUpload from '@/components/FileUpload';
import { DatePicker } from '@/components/ui/date-picker';

interface Subject {
    id: string;
    name: string;
    code?: string;
}

export default function AssignmentsPage() {
    const locale = useLocale();
    const isEnglish = locale === 'en';
    const tAssign = useTranslations('assignment');
    const tCommon = useTranslations('common');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [assignmentsError, setAssignmentsError] = useState(false);
    const [subjectsError, setSubjectsError] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

    // Form State
    const [formData, setFormData] = useState<CreateAssignmentDto>({
        title: '',
        description: '',
        subjectId: '',
        dueDate: '',
        maxScore: 100,
        attachments: [],
    });

    useEffect(() => {
        fetchAssignments();
        fetchSubjects();
    }, []);

    const fetchAssignments = async () => {
        setLoading(true);
        setAssignmentsError(false);
        try {
            setAssignments(await assignmentService.getMyAssignments());
        } catch (error) {
            console.error('Failed to fetch assignments', error);
            setAssignmentsError(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        setSubjectsError(false);
        try {
            const { data } = await apiClient.get('/subjects/teacher/my');
            setSubjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch teacher subjects', error);
            setSubjectsError(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedAssignment) {
                await assignmentService.update(selectedAssignment.id, {
                    title: formData.title,
                    description: formData.description,
                    dueDate: formData.dueDate || undefined,
                    maxScore: formData.maxScore,
                    attachments: formData.attachments,
                });
            } else {
                if (!formData.subjectId) throw new Error(isEnglish ? 'Select a subject before saving the assignment.' : 'اختر المادة قبل حفظ الواجب');
                await assignmentService.create({ ...formData, dueDate: formData.dueDate || undefined });
            }
            setIsModalOpen(false);
            resetForm();
            fetchAssignments();
        } catch (error: any) {
            alert(error.message || tAssign('saveError'));
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(tAssign('confirmDelete'))) {
            try {
                await assignmentService.delete(id);
                fetchAssignments();
            } catch (error) {
                console.error('Failed to delete assignment', error);
                alert(tAssign('deleteError'));
            }
        }
    };

    const handleEdit = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setFormData({
            title: assignment.title,
            description: assignment.description || '',
            subjectId: assignment.subjectId,
            dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
            maxScore: assignment.maxScore,
            attachments: assignment.attachments || [],
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setSelectedAssignment(null);
        setFormData({
            title: '',
            description: '',
            subjectId: '',
            dueDate: '',
            maxScore: 100,
            attachments: [],
        });
    };

    const handleFilesUploaded = (files: UploadResponse[]) => {
        const urls = files.map((f) => f.reference);
        setFormData({ ...formData, attachments: [...(formData.attachments || []), ...urls] });
    };

    const removeAttachment = (index: number) => {
        const newAttachments = [...(formData.attachments || [])];
        newAttachments.splice(index, 1);
        setFormData({ ...formData, attachments: newAttachments });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{tAssign('assignments')}</h1>
                <Link
                    href="/teacher/assignments/create"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    {tAssign('addAssignment')}
                </Link>
            </div>

            {loading ? (
                <p role="status" className="text-gray-500 dark:text-gray-400">{tAssign('loading')}</p>
            ) : assignmentsError ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                    <p>{tAssign('loadError')}</p>
                    <button type="button" onClick={fetchAssignments} className="mt-3 rounded-md bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800">
                        {tAssign('retry')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 col-span-full">{tAssign('empty')}</p>
                    ) : (
                        assignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                                        {assignment.title}
                                    </h3>
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                        {assignment.subject?.name}
                                    </span>
                                </div>

                                {assignment.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                        {assignment.description}
                                    </p>
                                )}

                                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span>📅</span>
                                        <span>{tAssign('dueDate')}: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>📊</span>
                                        <span>{tAssign('submissions')}: {assignment._count?.submissions || 0}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Link
                                        href={`/teacher/assignments/${assignment.id}/submissions`}
                                        className="flex-1 text-center px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200"
                                    >
                                        {tAssign('viewSubmissions')}
                                    </Link>
                                    <button
                                        onClick={() => handleEdit(assignment)}
                                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300"
                                    >
                                        {tAssign('edit')}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(assignment.id)}
                                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200"
                                    >
                                        {tAssign('delete')}
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
                            {selectedAssignment ? tAssign('editAssignment') : tAssign('addAssignment')}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {tAssign('assignmentTitle')}
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
                                        {tAssign('subject')}
                                    </label>
                                    <select
                                        required
                                        value={formData.subjectId}
                                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">{tAssign('selectSubject')}</option>
                                        {subjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </option>
                                        ))}
                                    </select>
                                    {subjectsError && <p role="alert" className="mt-2 text-sm text-red-600">{tAssign('subjectsError')}</p>}
                                    {!subjectsError && subjects.length === 0 && <p className="mt-2 text-sm text-gray-500">{tAssign('noSubjects')}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {tAssign('description')}
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {tAssign('dueDate')}
                                        </label>
                                        <DatePicker
                                            value={formData.dueDate}
                                            onChange={(dueDate) => setFormData({ ...formData, dueDate })}
                                            placeholder={tAssign('dueDate')}
                                            locale={isEnglish ? 'en' : 'ar'}
                                            className="w-full rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {tAssign('maxScore')}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.maxScore}
                                            onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {tAssign('attachFiles')}
                                    </label>
                                    <FileUpload onUploadComplete={handleFilesUploaded} />
                                    {formData.attachments && formData.attachments.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {tAssign('uploadedFiles')}:
                                            </p>
                                            <div className="space-y-2">
                                                {formData.attachments.map((url, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                                                    >
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                            {url.startsWith('file:') ? `${tAssign('files')} ${index + 1}` : url.split('/').pop()}
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
                                        {tCommon('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {tCommon('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
