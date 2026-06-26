'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, AlertCircle, Upload, Save, X, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';

interface Assignment {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    maxScore: number;
    subject: { name: string };
}

const MAX_FILE_SIZE_MB = 15;
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'video/mp4', 'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function SubmitAssignmentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assignmentId = searchParams.get('id');
    const { toast } = useToast();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [comments, setComments] = useState('');
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
                toast({ title: 'خطأ', description: 'تعذر تحميل الواجب', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        fetchAssignment();
    }, [assignmentId, router, toast]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        const validFiles: File[] = [];

        for (const f of newFiles) {
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                toast({ title: `الملف ${f.name} كبير جداً`, description: `الحد الأقصى ${MAX_FILE_SIZE_MB} ميجابايت`, variant: 'destructive' });
                continue;
            }
            if (!ALLOWED_TYPES.includes(f.type)) {
                toast({ title: `نوع الملف ${f.name} غير مسموح به`, description: 'الأنواع المسموحة: صور، PDF، فيديو، Word', variant: 'destructive' });
                continue;
            }
            validFiles.push(f);
        }

        setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // max 5 files
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (files.length === 0 && !comments.trim()) {
            toast({ title: 'خطأ', description: 'الرجاء إرفاق ملف أو كتابة إجابة', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        setUploadProgress(0);

        try {
            const fileUrls: string[] = [];

            // Upload files one by one with progress
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);
                const uploadRes = await apiClient.post('/upload/file', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (uploadRes.data?.url) {
                    fileUrls.push(uploadRes.data.url);
                }
                setUploadProgress(Math.round(((i + 1) / (files.length || 1)) * 70));
            }

            setUploadProgress(85);

            await apiClient.post(`/assignments/${assignmentId}/submit`, {
                content: comments,
                attachments: fileUrls,
            });

            setUploadProgress(100);
            setUploadedUrls(fileUrls);

            toast({
                title: '✅ تم التسليم بنجاح!',
                description: 'تم إرسال إجابتك. سيبدأ التصحيح الذكي قريباً.',
            });

            setTimeout(() => router.push('/student/assignments'), 1500);

        } catch (error: any) {
            toast({
                title: 'حدث خطأ',
                description: error.response?.data?.message || 'فشل في تسليم الواجب. تحقق من اتصالك.',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!assignment) {
        return <div className="text-center py-10 text-red-500">الواجب غير موجود</div>;
    }

    let daysRemaining = 0;
    if (assignment.dueDate) {
        const diff = new Date(assignment.dueDate).getTime() - new Date().getTime();
        daysRemaining = Math.ceil(diff / (1000 * 3600 * 24));
    }

    return (
        <div className="max-w-4xl space-y-6" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold">تسليم الواجب</h1>
                <p className="text-muted-foreground mt-2">قم برفع إجابتك لإرسالها للتصحيح التلقائي بالذكاء الاصطناعي</p>
            </div>

            {/* Assignment Details */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{assignment.title}</CardTitle>
                        <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                            {assignment.maxScore} درجة
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            تاريخ التسليم: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                        </div>
                        <div className={`flex items-center gap-2 ${daysRemaining <= 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            <Clock className="w-4 h-4" />
                            {daysRemaining > 0 ? `${daysRemaining} أيام متبقية` : 'انتهى الوقت'}
                        </div>
                    </div>
                    {assignment.description && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
                        </div>
                    )}
                    {daysRemaining <= 0 && assignment.dueDate && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                لقد تجاوزت موعد التسليم. قد يتم خصم درجات من قِبل المعلم.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submission Form */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>إجابتك</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Text Answer */}
                        <div className="space-y-2">
                            <Label htmlFor="comments">إجابة نصية / ملاحظات للمعلم</Label>
                            <Textarea
                                id="comments"
                                placeholder="اكتب إجابتك هنا، أو اترك أي ملاحظة للمعلم إذا أرفقت ملفاً..."
                                rows={5}
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        {/* File Upload */}
                        <div className="space-y-3">
                            <Label>المرفقات (صور، PDF، مستندات — حتى 5 ملفات)</Label>

                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf,.webp,.webp,.webp,.gif,.webp,.mp4,.webm,.doc,.docx"
                                multiple
                                disabled={submitting}
                            />

                            {/* Drop Zone */}
                            <div
                                onClick={() => !submitting && fileInputRef.current?.click()}
                                className="border-2 border-dashed border-primary/30 rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-primary/5 hover:border-primary/60 transition-all cursor-pointer group"
                            >
                                <Upload className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform text-primary/60" />
                                <p className="text-sm font-medium">اضغط لرفع ملف أو أكثر</p>
                                <p className="text-xs mt-1">صور، PDF، فيديو، Word — حتى {MAX_FILE_SIZE_MB} ميجابايت لكل ملف</p>
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
                        </div>

                        {/* Upload Progress */}
                        {submitting && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {uploadProgress < 80 ? 'جاري رفع الملفات...' : uploadProgress < 100 ? 'جاري التسليم...' : 'تم!'}
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
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || (files.length === 0 && !comments.trim())}
                                className="gap-2 min-w-32"
                            >
                                {submitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> تسليم الواجب</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
