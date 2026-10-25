'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Award, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type EarnedBadge = { id: string; badgeId: string; earnedAt: string };

export default function BadgesPage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/student/million-journey/badges')
      .then(({ data }) => { if (active) setBadges(Array.isArray(data?.data) ? data.data : []); })
      .catch(() => { if (active) setError(t('تعذر تحميل الأوسمة المسجلة.', 'Could not load your badges.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header><h1 className="flex items-center gap-2 text-2xl font-bold"><Award className="h-6 w-6 text-primary" />{t('الأوسمة المسجلة', 'Earned badges')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('يعرض النظام الأوسمة المكتسبة المحفوظة في حسابك فقط.', 'Only badges earned and saved to your account are shown.')}</p></header>
      {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('تحميل الأوسمة...', 'Loading badges...')}</p>
        : error ? <p role="alert" className="text-sm text-destructive">{error}</p>
          : badges.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{t('لا توجد أوسمة مسجلة لحسابك حاليًا.', 'There are no badges recorded for your account yet.')}</p>
            : <section className="space-y-3">{badges.map((badge) => (
              <Card key={badge.id}><CardHeader className="pb-2"><CardTitle className="text-base">{badge.badgeId}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{t('تاريخ الاستحقاق:', 'Earned on:')} {new Date(badge.earnedAt).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</CardContent></Card>
            ))}</section>}
    </main>
  );
}
