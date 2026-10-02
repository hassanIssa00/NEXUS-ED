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

export function ChangePasswordForm() {
    const { signOut } = useAuth();
    const { toast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ title: 'تعذر تغيير كلمة المرور', description: 'تأكيد كلمة المرور الجديدة غير متطابق.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            await apiClient.post('/auth/change-password', { currentPassword, newPassword });
            toast({ title: 'تم تغيير كلمة المرور', description: 'سجّل الدخول مجدداً باستخدام كلمة المرور الجديدة.' });
            await signOut();
        } catch (error: any) {
            toast({
                title: 'تعذر تغيير كلمة المرور',
                description: error.response?.data?.message || 'تحقق من كلمة المرور الحالية وحاول مرة أخرى.',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    تغيير كلمة المرور
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                        <Input id="current-password" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                            <Input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                            <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving} className="gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
