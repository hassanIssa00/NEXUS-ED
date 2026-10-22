'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Activity, AlertCircle, Play, RefreshCw, Trash2 } from 'lucide-react';

type Rule = { id: string; name: string; triggerType: string; condition: { operator: string; threshold: number; periodDays?: number }; actionData: { recipient?: string; message?: string }; isActive: boolean; lastRunAt?: string | null; _count?: { logs: number } };
type RuleLog = { id: string; targetId: string; executedAt: string; status: string; details?: { metric?: number } };
const getError = (error: any) => error?.response?.data?.message || error?.message || 'تعذر إتمام الطلب';

export default function AutomationRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<RuleLog[]>([]);
  const [selectedRule, setSelectedRule] = useState('');
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('ABSENCE');
  const [threshold, setThreshold] = useState('3');
  const [periodDays, setPeriodDays] = useState('7');
  const [recipient, setRecipient] = useState('BOTH');
  const [message, setMessage] = useState('تنبيه بخصوص {{studentName}}: {{metric}}');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await apiClient.get('/teacher/automation/rules');
      const items = Array.isArray(response.data?.data) ? response.data.data : [];
      setRules(items);
      if (selectedRule && items.some((rule: Rule) => rule.id === selectedRule)) await loadLogs(selectedRule);
      else if (selectedRule) { setSelectedRule(''); setLogs([]); }
    } catch (caught) { setError(getError(caught)); }
    finally { setLoading(false); }
  }, [selectedRule]);

  const loadLogs = async (id: string) => {
    try {
      const response = await apiClient.get(`/teacher/automation/rules/${id}/logs`);
      setLogs(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (caught) { setError(getError(caught)); }
  };

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await apiClient.post('/teacher/automation/rules', {
        name, triggerType,
        condition: { threshold: Number(threshold), operator: triggerType === 'ABSENCE' ? 'gte' : 'lte', periodDays: Number(periodDays) },
        actionData: { recipient, message }, isActive: true,
      });
      setName(''); setNotice('تم حفظ القاعدة وتفعيلها.'); await load();
    } catch (caught) { setError(getError(caught)); }
    finally { setBusy(false); }
  };

  const toggle = async (rule: Rule) => {
    try { await apiClient.put(`/teacher/automation/rules/${rule.id}/toggle`); await load(); }
    catch (caught) { setError(getError(caught)); }
  };

  const remove = async (rule: Rule) => {
    if (!window.confirm(`حذف القاعدة «${rule.name}» وسجل تشغيلها؟`)) return;
    try { await apiClient.delete(`/teacher/automation/rules/${rule.id}`); await load(); }
    catch (caught) { setError(getError(caught)); }
  };

  const runNow = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await apiClient.post('/teacher/automation/rules/run-now');
      const result = response.data?.data;
      setNotice(`اكتمل الفحص: ${result?.rulesEvaluated ?? 0} قاعدة، ${result?.notificationsCreated ?? 0} تنبيه جديد.`);
      await load();
    } catch (caught) { setError(getError(caught)); }
    finally { setBusy(false); }
  };

  const showLogs = async (rule: Rule) => { setSelectedRule(rule.id); await loadLogs(rule.id); };
  const triggerLabel = (type: string) => type === 'ABSENCE' ? 'تكرار الغياب' : type === 'LOW_GRADE' ? 'انخفاض الدرجات' : 'مؤشر السلوك';

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">القواعد الآلية</h1><p className="mt-1 text-sm text-muted-foreground">تنبيهات داخل المنصة مبنية على الغياب والدرجات والسلوك، مع سجل تنفيذ يمنع تكرار التنبيه يوميًا.</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} aria-label="تحديث" className="grid size-10 place-items-center rounded-md border"><RefreshCw className="h-4 w-4" /></button><button type="button" onClick={() => void runNow()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-50"><Play className="h-4 w-4" />تشغيل الآن</button></div></header>
      {error && <p role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(290px,0.75fr)_minmax(0,1.25fr)]">
        <section className="h-fit rounded-md border bg-card p-4 md:p-5"><h2 className="mb-4 text-lg font-semibold">إنشاء قاعدة</h2><form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm"><span className="font-medium">اسم القاعدة</span><input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="h-10 w-full rounded-md border bg-background px-3" /></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">المحفز</span><select value={triggerType} onChange={(event) => setTriggerType(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="ABSENCE">تكرار الغياب</option><option value="LOW_GRADE">انخفاض متوسط الدرجات</option><option value="BEHAVIOR">مؤشر السلوك</option></select></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">{triggerType === 'ABSENCE' ? 'عدد أيام الغياب أو أكثر' : triggerType === 'LOW_GRADE' ? 'المتوسط المئوي عنده أو أقل' : 'مؤشر السلوك عنده أو أقل'}</span><input type="number" min={0} max={triggerType === 'ABSENCE' ? 60 : 100} step="any" required value={threshold} onChange={(event) => setThreshold(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
          {triggerType === 'ABSENCE' && <label className="block space-y-1 text-sm"><span className="font-medium">خلال عدد الأيام</span><input type="number" min={1} max={90} value={periodDays} onChange={(event) => setPeriodDays(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>}
          <label className="block space-y-1 text-sm"><span className="font-medium">مَن يستلم التنبيه</span><select value={recipient} onChange={(event) => setRecipient(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="BOTH">الطالب وولي الأمر</option><option value="PARENT">ولي الأمر</option><option value="STUDENT">الطالب</option></select></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">نص التنبيه</span><textarea required maxLength={500} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full rounded-md border bg-background p-3" /><span className="text-xs text-muted-foreground">يمكن استخدام {'{{studentName}}'} و{'{{metric}}'}.</span></label>
          <button disabled={busy} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? 'جارٍ الحفظ...' : 'حفظ القاعدة'}</button>
        </form></section>
        <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">القواعد المسجلة</h2><span className="text-sm text-muted-foreground">{rules.length} قاعدة</span></div>
          {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</p> : rules.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد قواعد. أنشئ قاعدة لبدء التنبيهات.</p> : rules.map((rule) => <article key={rule.id} className="space-y-3 rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{rule.name}</h3><p className="mt-1 text-sm text-muted-foreground">{triggerLabel(rule.triggerType)} · الحد {rule.condition?.threshold}{rule.triggerType === 'ABSENCE' ? ` أيام خلال ${rule.condition?.periodDays || 7} يوم` : '%'}</p><p className="mt-1 text-xs text-muted-foreground">{rule.lastRunAt ? `آخر تشغيل: ${new Date(rule.lastRunAt).toLocaleString('ar-EG')}` : 'لم تعمل بعد'} · {rule._count?.logs || 0} سجل</p></div><span className={`rounded-sm px-2 py-1 text-xs ${rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>{rule.isActive ? 'فعالة' : 'متوقفة'}</span></div>
            <div className="flex flex-wrap gap-2"><button onClick={() => void toggle(rule)} className="h-9 rounded-md border px-3 text-sm">{rule.isActive ? 'إيقاف' : 'تفعيل'}</button><button onClick={() => void showLogs(rule)} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><Activity className="h-4 w-4" />سجل التنفيذ</button><button onClick={() => void remove(rule)} aria-label="حذف القاعدة" className="grid size-9 place-items-center rounded-md border text-red-700"><Trash2 className="h-4 w-4" /></button></div>
          </article>)}
        </section>
      </div>
      {selectedRule && <section className="space-y-3 rounded-md border bg-card p-4"><h2 className="text-lg font-semibold">سجل التنفيذ</h2>{logs.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد عمليات مسجلة حتى الآن.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-right text-muted-foreground"><th className="py-2">الوقت</th><th>معرف الطالب</th><th>المؤشر</th><th>الحالة</th></tr></thead><tbody className="divide-y">{logs.map((log) => <tr key={log.id}><td className="py-2">{new Date(log.executedAt).toLocaleString('ar-EG')}</td><td className="font-mono text-xs">{log.targetId}</td><td>{log.details?.metric ?? '—'}</td><td>{log.status === 'SUCCESS' ? 'تم' : 'تعذر'}</td></tr>)}</tbody></table></div>}</section>}
    </main>
  );
}
