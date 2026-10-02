'use client';

import { useEffect, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type EarnedBadge = { id: string; badgeId: string; earnedAt: string };

export default function BadgesPage() {
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/student/million-journey/badges')
      .then(({ data }) => { if (active) setBadges(Array.isArray(data?.data) ? data.data : []); })
      .catch((reason) => { if (active) setError(reason?.response?.data?.message || 'تعذر تحميل الأوسمة المسجلة.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6" dir="rtl">
      <header><h1 className="flex items-center gap-2 text-2xl font-bold"><Award className="h-6 w-6 text-primary" />الأوسمة المسجلة</h1><p className="mt-1 text-sm text-muted-foreground">يعرض النظام الأوسمة المكتسبة المحفوظة في حسابك فقط.</p></header>
      {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل الأوسمة...</p>
        : error ? <p role="alert" className="text-sm text-destructive">{error}</p>
          : badges.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد أوسمة مسجلة لحسابك حاليًا.</p>
            : <section className="space-y-3">{badges.map((badge) => (
              <Card key={badge.id}><CardHeader className="pb-2"><CardTitle className="text-base">{badge.badgeId}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">تاريخ الاستحقاق: {new Date(badge.earnedAt).toLocaleDateString()}</CardContent></Card>
            ))}</section>}
    </main>
  );
}
