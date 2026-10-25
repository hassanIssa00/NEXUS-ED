'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api/client';
import { Loader2, Save, User } from 'lucide-react';
import { ChangePasswordForm } from '@/components/settings/change-password-form';
import { useLocale } from 'next-intl';

export default function SettingsPage() {
    const isEnglish = useLocale() === 'en';
    const t = (ar: string, en: string) => isEnglish ? en : ar;
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
    });
    // Load current profile from backend
    useEffect(() => {
        setLoading(true);
        apiClient.get('/users/me')
            .then(res => {
                const u = res.data?.data || res.data;
                setFormData({
                    name: u?.name || u?.firstName || profile?.full_name || '',
                    phone: u?.phone || '',
                });
            })
            .catch(() => {
                // Fallback to auth context data
                setFormData({ name: profile?.full_name || '', phone: '' });
            })
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const initials = (formData.name || user?.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="max-w-2xl space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div>
                <h1 className="text-3xl font-bold">⚙️ {t('الإعدادات', 'Settings')}</h1>
                <p className="text-muted-foreground mt-1">{t('تحكم في ملفك الشخصي وتفضيلاتك', 'Manage your profile and preferences')}</p>
            </div>

            <div className="grid gap-6">
                {/* Profile Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            {t('الملف الشخصي', 'Profile')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16 text-xl">
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{formData.name || t('الطالب', 'Student')}</p>
                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('الاسم الكامل', 'Full name')}</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">{t('الاسم مرتبط بسجل المدرسة ولا يمكن تغييره من الحساب.', 'Your name is linked to the school record and cannot be changed from this account.')}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('البريد الإلكتروني', 'Email address')}</Label>
                                <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">{t('رقم الهاتف', 'Phone number')}</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder={isEnglish ? '05XXXXXXXX' : '05XXXXXXXX'}
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <ChangePasswordForm />

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
