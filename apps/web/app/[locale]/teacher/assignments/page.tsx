'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { assignmentService, Assignment, CreateAssignmentDto } from '@/lib/services/assignment.service';
import { subjectService } from '@/lib/services/subject.service';
import { UploadResponse } from '@/lib/services/upload.service';
import FileUpload from '@/components/FileUpload';

interface Subject {
    id: string;
    name: string;
    code?: string;
}

export default function AssignmentsPage() {
    const t = useTranslations('teacher');
    const tAssign = useTranslations('assignment');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
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
        try {
            const { nexusBridge } = await import('@/lib/nexusDataBridge');
            const realHw = nexusBridge.getHomework();
            const mapped: any[] = realHw.map(h => ({
                id: h.id,
                title: h.title,
                description: h.instructions,
                dueDate: h.dueDate,
                maxScore: h.totalScore,
                subject: { id: 's1', name: h.subject },
                _count: { submissions: h.submissionsCount },
                createdAt: h.createdAt,
            }));
            setAssignments(mapped);
        } catch (error) {
            console.error('Failed to fetch assignments', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        setSubjects([
            { id: 'sub-1', name: 'لغتي العربية' },
            { id: 'sub-2', name: 'القرآن الكريم' },
            { id: 'sub-3', name: 'الرياضيات' },
            { id: 'sub-4', name: 'العلوم' },
        ]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { nexusBridge } = await import('@/lib/nexusDataBridge');
            nexusBridge.saveHomework({
                id: selectedAssignment ? selectedAssignment.id : `hw-${Date.now()}`,
                title: formData.title,
                subject: subjects.find(s => s.id === formData.subjectId)?.name || 'لغتي العربية',
                grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
                instructions: formData.description || 'حل التمارين المطلوبة بدقة وعناية.',
                dueDate: formData.dueDate || new Date().toISOString().slice(0, 10),
                totalScore: formData.maxScore || 10,
                submissionsCount: selectedAssignment ? (selectedAssignment as any)._count?.submissions || 0 : 0,
                createdAt: new Date().toISOString(),
            });
            setIsModalOpen(false);
            resetForm();
            fetchAssignments();
        } catch (error: any) {
            alert(error.message || 'Failed to save assignment');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('confirmDelete'))) {
            try {
                await assignmentService.delete(id);
                fetchAssignments();
            } catch (error) {
                console.error('Failed to delete assignment', error);
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
        const urls = files.map((f) => f.url);
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
                <div>Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 col-span-full">{t('noLessons')}</p> // Reusing noLessons or add noAssignments
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
                                        {t('edit')}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(assignment.id)}
                                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200"
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
                                        <input
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                                                {t('uploadedFiles')}:
                                            </p>
                                            <div className="space-y-2">
                                                {formData.attachments.map((url, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                                                    >
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                            {url.split('/').pop()}
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
