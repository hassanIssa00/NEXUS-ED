'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, RefreshCw, Trophy } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  xpRequired: number;
  rewardType?: string | null;
}

interface JourneyProgress {
  totalXP: number;
  level: number;
  unlockedMilestones: Array<{ milestoneId: string; unlockedAt: string }>;
}

export default function MillionJourneyPage() {
  const [progress, setProgress] = useState<JourneyProgress | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [progressResponse, milestonesResponse] = await Promise.all([
        apiClient.get('/student/million-journey/progress'),
        apiClient.get('/student/million-journey/milestones'),
      ]);
      setProgress(progressResponse.data?.data ?? null);
      setMilestones(Array.isArray(milestonesResponse.data?.data) ? milestonesResponse.data.data : []);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const checkUnlocks = async () => {
    setRefreshing(true);
    try {
      await apiClient.post('/student/million-journey/check-unlocks');
      await load();
    } catch {
      setLoadFailed(true);
      setRefreshing(false);
    }
  };

  const unlocked = new Set(progress?.unlockedMilestones.map((item) => item.milestoneId) ?? []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">رحلة المليون</h1>
          <p className="mt-1 text-sm text-muted-foreground">نقاطك ومستويات الإنجاز المحفوظة في حسابك.</p>
        </div>
        <Button variant="outline" onClick={checkUnlocks} disabled={loading || refreshing}>
          <RefreshCw className={`ml-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث الإنجازات
        </Button>
      </header>

      {loadFailed && <p role="alert" className="text-sm text-destructive">تعذر تحميل بيانات الرحلة من النظام.</p>}

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-5 w-5" /> مجموع النقاط</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{loading ? '—' : progress?.totalXP ?? '—'}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Award className="h-5 w-5" /> المستوى</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{loading ? '—' : progress?.level ?? '—'}</CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">الإنجازات</h2>
        {loading ? <p className="text-sm text-muted-foreground">جاري تحميل الإنجازات...</p>
          : milestones.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد إنجازات معرفة في النظام حتى الآن.</p>
          : milestones.map((milestone) => {
            const isUnlocked = unlocked.has(milestone.id);
            const percent = milestone.xpRequired > 0
              ? Math.min(100, Math.round(((progress?.totalXP ?? 0) / milestone.xpRequired) * 100))
              : 0;
            return (
              <Card key={milestone.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{milestone.title}</h3>
                      {milestone.description && <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>}
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground">{isUnlocked ? 'مكتمل' : `${milestone.xpRequired} نقطة`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${isUnlocked ? 100 : percent}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </section>
    </main>
  );
}
