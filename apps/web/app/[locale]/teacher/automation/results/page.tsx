'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, FileText, Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Assignment { id: string; title: string; maxScore: number; subject?: { name?: string } }
interface Submission { id: string; grade?: number | null; score?: number | null; student?: { id: string; name?: string | null; email: string } }

export default function ResultsAnalysis() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get('/assignments/my').then(({ data }) => {
      if (active) setAssignments(Array.isArray(data) ? data : []);
    }).catch(() => {
      if (active) setLoadFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!assignmentId) { setSubmissions([]); return; }
    let active = true;
    setLoadingResults(true);
    apiClient.get(`/assignments/${assignmentId}/submissions`).then(({ data }) => {
      if (active) setSubmissions(Array.isArray(data) ? data : []);
    }).catch(() => {
      if (active) setLoadFailed(true);
    }).finally(() => {
      if (active) setLoadingResults(false);
    });
    return () => { active = false; };
  }, [assignmentId]);

  const selected = assignments.find((item) => item.id === assignmentId);
  const maxScore = Number(selected?.maxScore || 0);
  const graded = useMemo(() => submissions
    .map((item) => ({ ...item, value: item.grade ?? item.score }))
    .filter((item): item is typeof item & { value: number } => typeof item.value === 'number'), [submissions]);
  const average = graded.length ? graded.reduce((sum, item) => sum + item.value, 0) / graded.length : null;
  const topStudents = [...graded].sort((a, b) => b.value - a.value).slice(0, 5);
  const distribution = maxScore > 0 ? [
    { label: '0–59%', low: 0, high: 0.6 },
    { label: '60–69%', low: 0.6, high: 0.7 },
    { label: '70–79%', low: 0.7, high: 0.8 },
    { label: '80–89%', low: 0.8, high: 0.9 },
    { label: '90–100%', low: 0.9, high: 1.01 },
  ].map((band) => ({ ...band, count: graded.filter((item) => item.value / maxScore >= band.low && item.value / maxScore < band.high).length })) : [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="flex items-center gap-4">
        <Link href="/teacher/automation"><Button variant="outline" size="icon" aria-label="العودة"><ArrowRight className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-2xl font-bold">تحليل النتائج</h1><p className="mt-1 text-sm text-muted-foreground">تحليل الدرجات المسجلة للتكليفات المسندة لك.</p></div>
      </header>

      {loadFailed && <p role="alert" className="text-sm text-destructive">تعذر تحميل النتائج من النظام.</p>}

      <Card>
        <CardContent className="max-w-xl space-y-2 p-5">
          <label className="text-sm font-medium">الواجب أو التقييم</label>
          <Select value={assignmentId} onValueChange={setAssignmentId}>
            <SelectTrigger><SelectValue placeholder={loading ? 'جاري التحميل...' : 'اختر واجبًا مسندًا لك'} /></SelectTrigger>
            <SelectContent>{assignments.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent>
          </Select>
          {!loading && assignments.length === 0 && <p className="text-sm text-muted-foreground">لا توجد تكليفات مسجلة لهذا الحساب.</p>}
        </CardContent>
      </Card>

      {assignmentId && !loadingResults && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> التسليمات</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{submissions.length}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> درجات مسجلة</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{graded.length}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" /> المتوسط</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{average === null ? '—' : `${Math.round((average / maxScore) * 100)}%`}</CardContent></Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">توزيع الدرجات المسجلة</CardTitle></CardHeader>
              <CardContent>
                {graded.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لم تُرصد درجات لهذا التكليف بعد.</p> : (
                  <div className="space-y-3">{distribution.map((band) => (
                    <div key={band.label} className="grid grid-cols-[70px_1fr_32px] items-center gap-3 text-sm">
                      <span>{band.label}</span><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${(band.count / graded.length) * 100}%` }} /></div><span className="text-right tabular-nums">{band.count}</span>
                    </div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">أعلى الدرجات</CardTitle></CardHeader>
              <CardContent>
                {topStudents.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد درجات مسجلة.</p> : (
                  <div className="divide-y">{topStudents.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="flex items-center gap-3"><Badge variant="secondary">{index + 1}</Badge><span>{item.student?.name || item.student?.email || 'طالب مسجل'}</span></div><span className="font-semibold tabular-nums">{item.value} / {maxScore}</span></div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
      {loadingResults && <p className="text-sm text-muted-foreground">جاري تحميل التسليمات...</p>}
    </main>
  );
}
