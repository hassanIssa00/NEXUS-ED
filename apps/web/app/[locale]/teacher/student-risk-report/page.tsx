'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleAlert, Loader2, Search, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SchoolClass = { id: string; name: string };
type RiskAlert = { type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string; value: number; threshold: number };
type Warning = { studentId: string; studentName: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; alerts: RiskAlert[]; className: string };

export default function StudentRiskReportPage() {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('all');
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await apiClient.get('/classes');
        const availableClasses: SchoolClass[] = Array.isArray(data) ? data : [];
        if (active) setClasses(availableClasses);
        const results = await Promise.all(availableClasses.map(async (schoolClass) => {
          const response = await apiClient.get('/analytics/student/early-warnings', { params: { classId: schoolClass.id } });
          return (Array.isArray(response.data) ? response.data : []).map((item: Omit<Warning, 'className'>) => ({ ...item, className: schoolClass.name }));
        }));
        if (active) setWarnings(results.flat());
      } catch (reason: any) {
        if (active) setError(reason?.response?.data?.message || 'تعذر تحميل الإنذارات الفعلية من النظام.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const filteredWarnings = useMemo(() => warnings.filter((item) => {
    const matchesName = item.studentName.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    return matchesName && (classId === 'all' || item.className === classes.find((item) => item.id === classId)?.name);
  }), [warnings, search, classId, classes]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10" dir="rtl">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800"><AlertTriangle className="h-5 w-5" /></span>
        <div><h1 className="text-2xl font-bold">إنذارات المتابعة الأكاديمية</h1><p className="mt-1 text-sm text-muted-foreground">يعرض مؤشرات لها سجلات فعلية فقط، ولا يصنف الطلاب عند غياب البيانات.</p></div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" placeholder="ابحث باسم الطالب" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">كل الفصول المتاحة</option>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      {loading ? <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل الإنذارات...</p>
        : error ? <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><CircleAlert className="mt-0.5 h-4 w-4" />{error}</p>
          : classes.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد فصول مرتبطة بحسابك.</p>
            : filteredWarnings.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد إنذارات مسجلة ضمن البيانات المتاحة.</p>
              : <section className="space-y-3">{filteredWarnings.map((warning) => (
                <Card key={`${warning.className}:${warning.studentId}`}>
                  <CardHeader className="pb-3"><CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base"><span>{warning.studentName}</span><span className="text-xs font-medium text-muted-foreground">{warning.className}</span></CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="flex items-center gap-2 text-sm font-semibold">{warning.riskLevel === 'LOW' ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />} مستوى التنبيه: {warning.riskLevel}</p>
                    <ul className="space-y-2">{warning.alerts.map((alert, index) => <li key={`${alert.type}:${index}`} className="flex flex-wrap justify-between gap-2 rounded-md bg-muted/50 p-3 text-sm"><span>{alert.message}</span><span className="text-xs text-muted-foreground">{alert.value} · الحد {alert.threshold}</span></li>)}</ul>
                  </CardContent>
                </Card>
              ))}</section>}
    </main>
  );
}
