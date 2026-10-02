'use client';

import { useEffect, useState } from 'react';
import { Activity, BookOpen, CalendarCheck, FileCheck2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi, TeacherDashboardResponse } from '@/lib/api/dashboard';

export function TeacherAnalyticsDashboard() {
  const [dashboard, setDashboard] = useState<TeacherDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    dashboardApi.getTeacherDashboard().then((data) => {
      if (active) setDashboard(data);
    }).catch(() => {
      if (active) setLoadFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const summary = dashboard?.summary;
  const metrics = [
    { label: 'الفصول', value: summary?.totalClasses, icon: BookOpen },
    { label: 'الطلاب', value: summary?.totalStudents, icon: Users },
    { label: 'تسليمات قيد المراجعة', value: summary?.pendingSubmissions, icon: FileCheck2 },
    { label: 'سجلات الحضور', value: dashboard?.attendanceSummary.totalRecords, icon: CalendarCheck },
  ];

  if (loading) return <p className="p-6 text-sm text-muted-foreground">جاري تحميل التحليلات...</p>;
  if (loadFailed || !dashboard) return <p role="alert" className="p-6 text-sm text-destructive">تعذر تحميل تحليلات المعلم من النظام.</p>;

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">تحليلات المعلم</h1>
        <p className="mt-1 text-sm text-muted-foreground">ملخص مباشر من الفصول والواجبات والحضور المسجل.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-bold">{value ?? '—'}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> الفصول المسندة</CardTitle></CardHeader>
          <CardContent>
            {dashboard.classPerformance.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد فصول مسندة لهذا الحساب.</p> : (
              <div className="divide-y">
                {dashboard.classPerformance.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                    <div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.studentCount} طالب، {item.subjectCount} مادة</p></div>
                    <span className="text-sm tabular-nums">{item.averageGrade ? `${item.averageGrade}%` : 'لا توجد درجات'}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">الواجبات المسندة مؤخرًا</CardTitle></CardHeader>
          <CardContent>
            {dashboard.recentAssignments.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد واجبات مسجلة.</p> : (
              <div className="divide-y">
                {dashboard.recentAssignments.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                    <div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.subject}</p></div>
                    <span className="text-sm tabular-nums">{item.submissions} تسليم</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
