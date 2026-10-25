'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle, CheckCircle, FileText, Bot } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';

interface Submission {
    id: string;
    content?: string;
    attachments: string[];
    grade?: number;
    score?: number;
    feedback?: string;
    submittedAt: string;
    gradedAt?: string;
}

interface Assignment {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    maxScore: number;
    points?: number;
    subject: { name: string };
    submission: Submission | null; // backend flatMaps this directly onto each assignment
    submissions?: Submission[];
    status?: 'pending' | 'submitted' | 'graded';
}

export default function ViewSubmissionPage() {
    const router = useRouter();
    const locale = useLocale() === 'en' ? 'en' : 'ar';
    const isEnglish = locale === 'en';
    const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish]);
    const params = useParams();
    const assignmentId = params.id as string;
    const { toast } = useToast();
    
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!assignmentId) {
            router.push('/student/assignments');
            return;
        }

        const fetchAssignment = async () => {
            try {
                // Fetch all student assignments to get the submission details
                // The backend findByStudent endpoint attaches the submission to the assignment directly.
                const res = await apiClient.get<any>(`/assignments/student`);
                const assignmentsList = res.data?.data || res.data || [];
                const found = assignmentsList.find((a: any) => a.id === assignmentId);
                
                if (found) {
                    setAssignment(found);
                } else {
                    toast({ title: t('خطأ', 'Error'), description: t('الواجب غير موجود', 'Assignment not found'), variant: 'destructive' });
                }
            } catch (error) {
                console.error(error);
                toast({ title: t('خطأ', 'Error'), description: t('تعذر تحميل بيانات الواجب', 'Could not load assignment details'), variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        fetchAssignment();
    }, [assignmentId, router, toast, t]);

    if (loading) {
        return <div className="text-center py-10" dir={isEnglish ? 'ltr' : 'rtl'}>{t('جاري التحميل...', 'Loading…')}</div>;
    }

    if (!assignment) {
        return <div className="text-center py-10 text-red-500" dir={isEnglish ? 'ltr' : 'rtl'}>{t('الواجب غير موجود', 'Assignment not found')}</div>;
    }

    const submission = assignment.submission; // Attached from the backend DTO logic

    let fbText = submission?.feedback || '';
    let aiMeta = null;
    try {
        if (fbText.startsWith('{')) {
            const parsed = JSON.parse(fbText);
            fbText = parsed.text || '';
            aiMeta = {
                strengths: parsed.strengths,
                weaknesses: parsed.weaknesses,
                isAiGenerated: parsed.isAiGenerated
            };
        }
    } catch (e) {}

    return (
        <div className="max-w-4xl space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('تفاصيل الواجب والتسليم', 'Assignment and submission details')}</h1>
                    <p className="text-muted-foreground mt-2">{t('استعرض إجابتك وتقييم المدرس أو الذكاء الاصطناعي', 'Review your answer and the teacher or AI feedback')}</p>
                </div>
                <Button variant="outline" onClick={() => router.back()}>{t('العودة للواجبات', 'Back to assignments')}</Button>
            </div>

            {/* Assignment Details */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{assignment.title}</CardTitle>
                        <Badge variant="secondary">{assignment.subject?.name}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {assignment.description && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md mb-4">
                            <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submission Status */}
            {!submission ? (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                    <CardContent className="p-6 text-center text-amber-800 dark:text-amber-200">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h2 className="text-lg font-bold mb-2">{t('لم يتم التسليم بعد', 'Not submitted yet')}</h2>
                        <Button onClick={() => router.push(`/student/assignments/submit?id=${assignment.id}`)}>
                            {t('تسليم الواجب الآن', 'Submit assignment now')}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Grade and Feedback */}
                    {submission.gradedAt ? (
                        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <CheckCircle className="w-32 h-32 text-green-600" />
                            </div>
                            <CardContent className="p-6 relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <Badge className="bg-green-600 hover:bg-green-700 text-lg px-3 py-1">
                                        {t('الدرجة:', 'Score:')} {submission.grade} / {assignment.maxScore}
                                    </Badge>
                                    <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                                        <Bot className="w-4 h-4" /> {t('تم التصحيح', 'Graded')}
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-100 dark:border-green-800">
                                    <h3 className="font-bold mb-2 text-gray-800 dark:text-gray-200">{t('ملاحظات التقييم:', 'Grading feedback:')}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                        {fbText || t('لا توجد ملاحظات إضافية.', 'No additional feedback.')}
                                    </p>
                                    
                                    {aiMeta?.isAiGenerated && (
                                        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                                            {aiMeta.strengths && aiMeta.strengths.length > 0 && (
                                                <div className="mb-2">
                                                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">{t('نقاط القوة:', 'Strengths:')}</p>
                                                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                                                        {aiMeta.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {aiMeta.weaknesses && aiMeta.weaknesses.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">{t('نقاط للتحسين:', 'Areas to improve:')}</p>
                                                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                                                        {aiMeta.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
                            <CardContent className="p-6 flex items-center gap-3 text-blue-800 dark:text-blue-200">
                                <Clock className="w-6 h-6 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold">{t('تم الاستلام بنجاح', 'Submitted successfully')}</h3>
                                    <p className="text-sm opacity-80">{t('بانتظار التصحيح ورصد الدرجة...', 'Waiting for grading and score posting…')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* What the student submitted */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('إجابتك المرسلة', 'Your submitted work')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
                                <Clock className="w-4 h-4" />
                                {t('تم التسليم في:', 'Submitted:')} {new Date(submission.submittedAt).toLocaleString(isEnglish ? 'en-US' : 'ar-SA')}
                            </div>

                            {submission.content && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border">
                                    <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
                                </div>
                            )}

                            {submission.attachments && submission.attachments.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-sm mb-3">{t('المرفقات:', 'Attachments:')}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {submission.attachments.map((url: string, index: number) => {
                                            const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i);
                                            return (
                                                <a 
                                                    key={index} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <FileText className="w-8 h-8 text-blue-500" />
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-medium truncate" dir="ltr">{url.split('/').pop()}</p>
                                                        <p className="text-xs text-muted-foreground">{t('اضغط للعرض', 'Open attachment')}</p>
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
