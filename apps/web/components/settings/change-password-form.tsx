'use client';

import { useState, type FormEvent } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api/client';
import { useLocale } from 'next-intl';

export function ChangePasswordForm() {
    const isEnglish = useLocale() === 'en';
    const t = (ar: string, en: string) => isEnglish ? en : ar;
    const { signOut } = useAuth();
    const { toast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ title: t('تعذر تغيير كلمة المرور', 'Could not change password'), description: t('تأكيد كلمة المرور الجديدة غير متطابق.', 'The new passwords do not match.'), variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            await apiClient.post('/auth/change-password', { currentPassword, newPassword });
            toast({ title: t('تم تغيير كلمة المرور', 'Password changed'), description: t('سجّل الدخول مجدداً باستخدام كلمة المرور الجديدة.', 'Sign in again using your new password.') });
            await signOut();
        } catch (error: any) {
            toast({
                title: t('تعذر تغيير كلمة المرور', 'Could not change password'),
                description: isEnglish ? 'Check your current password and try again.' : (error.response?.data?.message || 'تحقق من كلمة المرور الحالية وحاول مرة أخرى.'),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card dir={isEnglish ? 'ltr' : 'rtl'}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    {t('تغيير كلمة المرور', 'Change password')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">{t('كلمة المرور الحالية', 'Current password')}</Label>
                        <Input id="current-password" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">{t('كلمة المرور الجديدة', 'New password')}</Label>
                            <Input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">{t('تأكيد كلمة المرور', 'Confirm password')}</Label>
                            <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving} className="gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? t('جارٍ التحديث...', 'Updating...') : t('تحديث كلمة المرور', 'Update password')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
