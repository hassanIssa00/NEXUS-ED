'use client';

import { useState, useEffect } from 'react';
import { Send, Bell, Loader2, CheckCircle2, Users, BookOpen, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';

interface TeacherClass {
    id: string;
    name: string;
}

const TARGET_TYPES = [
    { value: 'all-students', ar: '👥 جميع طلابي', en: '👥 All my students', icon: Users },
    { value: 'parents', ar: '👨‍👩‍👦 أولياء الأمور', en: '👨‍👩‍👦 Parents', icon: Heart },
] as const;

export default function NotificationsPage() {
    const isEnglish = useLocale() === 'en';
    const t = (ar: string, en: string) => isEnglish ? en : ar;
    const { toast } = useToast();
    const [classes, setClasses] = useState<TeacherClass[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [classLoadFailed, setClassLoadFailed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [sentCount, setSentCount] = useState(0);

    const [form, setForm] = useState({
        targetType: 'all-students',
        targetClassId: '',
        title: '',
        message: '',
    });

    // Load teacher's classes
    useEffect(() => {
        apiClient.get('/notifications/my-classes')
            .then(res => {
                const data = res.data?.data || res.data || [];
                setClasses(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                setClasses([]);
                setClassLoadFailed(true);
            })
            .finally(() => setLoadingClasses(false));
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) {
            toast({ title: t('خطأ', 'Error'), description: t('عنوان ونص الرسالة مطلوبان', 'A title and message are required.'), variant: 'destructive' });
            return;
        }
        if (form.targetType === 'class' && !form.targetClassId) {
            toast({ title: t('خطأ', 'Error'), description: t('يرجى اختيار الفصل', 'Select a class.'), variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const res = await apiClient.post('/notifications/send', {
                title: form.title,
                message: form.message,
                targetType: form.targetType,
                targetClassId: form.targetClassId || undefined,
            });
            if (!res.data?.success || !Number.isInteger(res.data.sent)) {
                throw new Error('The notification service did not confirm delivery');
            }
            const count = res.data.sent as number;
            setSentCount(count);
            setSent(true);
            setForm({ targetType: 'all-students', targetClassId: '', title: '', message: '' });
            toast({ title: t(`تم حفظ الإشعار لـ ${count} مستلم`, `Notification saved for ${count} recipients`), description: t('تم تسجيله في النظام.', 'It was recorded in the system.') });
        } catch (e: any) {
            toast({
                title: t('خطأ في الإرسال', 'Send error'),
                description: t('فشل إرسال الإشعار', 'Could not send the notification.'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div>
                <h1 className="text-3xl font-bold">{t('🔔 إرسال التنبيهات', '🔔 Send notifications')}</h1>
                <p className="text-muted-foreground mt-1">{t('إرسال إشعارات فورية للطلاب وأولياء الأمور', 'Send instant notifications to students and parents.')}</p>
            </div>

            {/* Success Banner */}
            <AnimatePresence>
                {sent && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
                    >
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                            {t(`تم إرسال الإشعار بنجاح إلى ${sentCount} شخص!`, `Notification sent successfully to ${sentCount} people!`)}
                        </p>
                        <Button variant="ghost" size="sm" onClick={() => setSent(false)} className="mr-auto text-green-700">
                            ×
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            <Card>
                <CardHeader>
                    <CardTitle>{t('رسالة جديدة', 'New notification')}</CardTitle>
                    <CardDescription>{t('سيصل هذا الإشعار فورًا عبر التطبيق', 'This notification will be delivered through the app.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSend} className="space-y-5">
                        {/* Target Type */}
                        <div className="space-y-2">
                            <Label>{t('المستلمون', 'Recipients')}</Label>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {TARGET_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, targetType: type.value, targetClassId: '' })}
                                        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                            form.targetType === type.value
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-border hover:border-primary/40'
                                        }`}
                                    >
                                        <type.icon className="w-4 h-4" />
                                        {isEnglish ? type.en : type.ar}
                                    </button>
                                ))}
                            </div>

                            {/* Class-specific option */}
                            {!loadingClasses && classes.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, targetType: 'class' })}
                                    className={`w-full flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                        form.targetType === 'class'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-border hover:border-primary/40'
                                    }`}
                                >
                                    <BookOpen className="w-4 h-4" />
                                    {t('📋 فصل دراسي محدد', '📋 A specific class')}
                                </button>
                            )}
                            {classLoadFailed && <p className="text-sm text-destructive">{t('تعذر تحميل فصولك من النظام.', 'Could not load your classes from the system.')}</p>}

                            {/* Class selector */}
                            {form.targetType === 'class' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                    <Select value={form.targetClassId} onValueChange={v => setForm({ ...form, targetClassId: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('اختر الفصل...', 'Select a class...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map(cls => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </motion.div>
                            )}
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="notif-title">{t('عنوان التنبيه', 'Notification title')}</Label>
                            <Input
                                id="notif-title"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder={t('مثال: تذكير بموعد الاختبار غدًا 📝', 'e.g. Reminder: test tomorrow 📝')}
                                required
                            />
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <Label htmlFor="notif-msg">{t('نص الرسالة', 'Message')}</Label>
                            <Textarea
                                id="notif-msg"
                                value={form.message}
                                onChange={e => setForm({ ...form, message: e.target.value })}
                                placeholder={t('اكتب تفاصيل الإشعار هنا...', 'Enter the notification details...')}
                                className="min-h-[120px]"
                                required
                            />
                            <p className="text-xs text-muted-foreground text-left">{form.message.length}/500</p>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading} className="gap-2 min-w-36">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {loading ? t('جارٍ الإرسال...', 'Sending...') : t('إرسال الآن', 'Send now')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
