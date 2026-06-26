'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, Upload, Save, X, Bot, Loader2 } from 'lucide-react'
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
import { arSA } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api/client'
import { useRouter } from 'next/navigation'

interface Subject {
    id: string;
    name: string;
}

export default function CreateAssignmentPage() {
    const { toast } = useToast()
    const router = useRouter()
    
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [subjectId, setSubjectId] = useState('')
    const [date, setDate] = useState<Date>()
    const [maxScore, setMaxScore] = useState('10')
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [subjects, setSubjects] = useState<Subject[]>([])
    
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Fetch real subjects if API is ready, for now we will hardcode a fallback if empty
        const fetchSubjects = async () => {
            try {
                // If there's a subjects endpoint, we'd use it here. 
                // For MVP, if it fails, we fall back to a default subject.
                const res = await apiClient.get('/subjects').catch(() => null);
                if (res?.data && res.data.length > 0) {
                    setSubjects(res.data);
                } else {
                    // Fallback to a default subject so the teacher isn't blocked
                    setSubjects([{ id: 'default-subject', name: 'المادة الافتراضية' }]);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchSubjects();
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast({ title: 'حجم الملف كبير جداً', description: 'يجب أن يكون أقل من 10MB', variant: 'destructive' });
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

    const handleGenerateWithAI = async () => {
        if (!title || !subjectId) {
            toast({ title: 'معلومات ناقصة', description: 'يرجى إدخال العنوان واختيار المادة أولاً ليتمكن الذكاء الاصطناعي من توليد الأسئلة المناسبة.', variant: 'destructive' })
            return
        }
        
        setIsGenerating(true)
        try {
            const selectedSubject = subjects.find(s => s.id === subjectId)?.name || 'عام';
            const res = await apiClient.post('/ai/generate-exam', {
                topic: title,
                subject: selectedSubject,
                questionCount: 3,
                questionType: 'mixed'
            });

            if (res.data?.questions) {
                let aiText = "تم توليد هذه الأسئلة بواسطة الذكاء الاصطناعي بناءً على العنوان:\n\n";
                res.data.questions.forEach((q: any, i: number) => {
                    aiText += `${i + 1}. ${q.question}\n`;
                    if (q.type === 'multiple_choice' && q.options) {
                        q.options.forEach((opt: string, j: number) => {
                            aiText += `   - ${opt}\n`;
                        });
                    }
                    aiText += `   الإجابة الصحيحة: ${q.correctAnswer}\n\n`;
                });
                
                setDescription(prev => prev ? prev + '\n\n' + aiText : aiText);
                toast({ title: 'تم التوليد بنجاح', description: 'تمت إضافة الأسئلة إلى حقل الوصف.' })
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'خطأ', description: 'تعذر توليد الأسئلة. يرجى المحاولة لاحقاً.', variant: 'destructive' })
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!title || !subjectId) {
            toast({ title: 'خطأ', description: 'يرجى إدخال العنوان والمادة', variant: 'destructive' })
            return
        }

        setLoading(true)
        
        try {
            let uploadedFileUrls: string[] = [];

            // 1. Upload File if selected
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await apiClient.post('/upload/file', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data && uploadRes.data.url) {
                    uploadedFileUrls.push(uploadRes.data.url);
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
            };

            await apiClient.post('/assignments', assignmentData);

            toast({
                title: "تم إنشاء الواجب بنجاح ✅",
                description: "تم رفع الواجب وإشعار الطلاب.",
            })

            router.push('/teacher/assignments')
            
        } catch (error: any) {
            toast({
                title: "حدث خطأ",
                description: error.response?.data?.message || "فشل في إنشاء الواجب",
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">إنشاء واجب جديد 📝</h2>
                <p className="text-muted-foreground">إضافة واجب أو اختبار جديد ورفعه للطلاب</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>تفاصيل الواجب</CardTitle>
                    <CardDescription>أدخل المعلومات الأساسية وأرفق الملف المطلوب</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>عنوان الواجب</Label>
                                <Input 
                                    placeholder="مثال: حل تمارين الجمع والطرح" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>المادة (Subject)</Label>
                                <Select value={subjectId} onValueChange={setSubjectId} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر المادة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(sub => (
                                            <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>الوصف والتعليمات (للتصحيح الآلي)</Label>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleGenerateWithAI}
                                    disabled={isGenerating}
                                    className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Bot className="w-4 h-4 mr-2" />
                                    )}
                                    توليد أسئلة بالذكاء الاصطناعي
                                </Button>
                            </div>
                            <Textarea
                                placeholder="اكتب تعليمات الواجب ومعايير التصحيح هنا..."
                                className="min-h-[160px]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>تاريخ التسليم</Label>
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
                                            {date ? format(date, "PPP", { locale: arSA }) : <span>اختر التاريخ (اختياري)</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                            dir="rtl"
                                            locale={arSA}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>الدرجة الكلية</Label>
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
                            <Label>المرفقات (PDF, صورة، فيديو)</Label>
                            
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
                                    <p className="text-sm">اضغط للرفع أو اسحب الملفات هنا</p>
                                    <p className="text-xs mt-1">PDF, DOCX, PNG (Max 10MB)</p>
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
                            <Button variant="outline" type="button" onClick={() => router.back()}>إلغاء</Button>
                            <Button type="submit" disabled={loading} className="gap-2">
                                <Save className="w-4 h-4" />
                                {loading ? 'جاري الرفع والحفظ...' : 'نشر الواجب للطلاب'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
