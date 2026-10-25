'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api/client';
import { Loader2, Save, User, Bell, Shield, Lock } from 'lucide-react';
import { useLocale } from 'next-intl';

export default function ParentSettingsPage() {
    const isEnglish = useLocale() === 'en';
    const t = (ar: string, en: string) => isEnglish ? en : ar;
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [notifications, setNotifications] = useState({
        grades: true,
        attendance: true,
        assignments: false,
    });

    useEffect(() => {
        setLoading(true);
        apiClient.get('/users/me')
            .then(res => {
                const u = res.data?.data || res.data;
                setFormData({ name: u?.name || profile?.full_name || '', phone: u?.phone || '' });
            })
            .catch(() => setFormData({ name: profile?.full_name || '', phone: '' }))
            .finally(() => setLoading(false));
    }, [profile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.patch('/users/me', { phone: formData.phone });
            toast({ title: `✅ ${t('تم الحفظ', 'Saved')}`, description: t('تم تحديث بياناتك بنجاح', 'Your information has been updated.') });
        } catch (e: any) {
            toast({ title: t('خطأ', 'Error'), description: isEnglish ? 'Could not save settings. Try again.' : (e.response?.data?.message || 'فشل حفظ الإعدادات'), variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    const initials = (formData.name || 'P').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="max-w-2xl space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div>
                <h1 className="text-3xl font-bold">⚙️ {t('إعدادات ولي الأمر', 'Parent settings')}</h1>
                <p className="text-muted-foreground mt-1">{t('تحكم في ملفك الشخصي وتفضيلاتك', 'Manage your profile and preferences')}</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />{t('الملف الشخصي', 'Profile')}</CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16"><AvatarFallback className="bg-amber-100 text-amber-700 font-bold text-lg">{initials}</AvatarFallback></Avatar>
                            <div><p className="font-semibold">{formData.name || t('ولي الأمر', 'Parent')}</p><p className="text-sm text-muted-foreground">{user?.email}</p></div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="p-name">{t('الاسم الكامل', 'Full name')}</Label>
                                <Input id="p-name" value={formData.name} disabled className="bg-muted" />
                                <p className="text-xs text-muted-foreground">{t('الاسم مرتبط بسجل المدرسة ولا يمكن تغييره من الحساب.', 'Your name is linked to the school record and cannot be changed from this account.')}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('البريد الإلكتروني', 'Email address')}</Label>
                                <Input value={user?.email || ''} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="p-phone">{t('رقم الهاتف', 'Phone number')}</Label>
                                <Input id="p-phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="05XXXXXXXX" dir="ltr" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />{t('متابعة الأبناء', 'Child updates')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { key: 'grades', label: t('إشعارات الدرجات', 'Grade notifications'), desc: t('تنبيه فوري عند تسجيل درجة جديدة', 'Get notified when a new grade is recorded') },
                            { key: 'attendance', label: t('إشعارات الغياب والتأخر', 'Absence and lateness notifications'), desc: t('تنبيه في حال غياب أو تأخر ابنك', 'Get notified if your child is absent or late') },
                            { key: 'assignments', label: t('إشعارات الواجبات', 'Assignment notifications'), desc: t('تنبيه عند إضافة واجب جديد لابنك', 'Get notified when a new assignment is added for your child') },
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">{item.label}</Label>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </div>
                                <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={val => setNotifications({ ...notifications, [item.key]: val })} />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-32">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ التغييرات', 'Save changes')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
