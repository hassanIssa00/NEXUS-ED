'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { Activity, AlertCircle, Play, RefreshCw, Trash2 } from 'lucide-react';

type Rule = { id: string; name: string; triggerType: string; condition: { operator: string; threshold: number; periodDays?: number }; actionData: { recipient?: string; message?: string }; isActive: boolean; lastRunAt?: string | null; _count?: { logs: number } };
type RuleLog = { id: string; targetId: string; executedAt: string; status: string; details?: { metric?: number } };
export default function AutomationRulesPage() {
  const isEnglish = useLocale() === 'en';
  const tr = (ar: string, en: string) => isEnglish ? en : ar;
  const getError = () => tr('تعذر إتمام الطلب.', 'Could not complete the request.');
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<RuleLog[]>([]);
  const [selectedRule, setSelectedRule] = useState('');
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('ABSENCE');
  const [threshold, setThreshold] = useState('3');
  const [periodDays, setPeriodDays] = useState('7');
  const [recipient, setRecipient] = useState('BOTH');
  const [message, setMessage] = useState(() => tr('تنبيه بخصوص {{studentName}}: {{metric}}', 'Alert for {{studentName}}: {{metric}}'));
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
    } catch { setError(getError()); }
    finally { setLoading(false); }
  }, [selectedRule]);

  const loadLogs = async (id: string) => {
    try {
      const response = await apiClient.get(`/teacher/automation/rules/${id}/logs`);
      setLogs(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch { setError(getError()); }
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
      setName(''); setNotice(tr('تم حفظ القاعدة وتفعيلها.', 'Rule saved and activated.')); await load();
    } catch { setError(getError()); }
    finally { setBusy(false); }
  };

  const toggle = async (rule: Rule) => {
    try { await apiClient.put(`/teacher/automation/rules/${rule.id}/toggle`); await load(); }
    catch { setError(getError()); }
  };

  const remove = async (rule: Rule) => {
    if (!window.confirm(tr(`حذف القاعدة «${rule.name}» وسجل تشغيلها؟`, `Delete the rule “${rule.name}” and its run history?`))) return;
    try { await apiClient.delete(`/teacher/automation/rules/${rule.id}`); await load(); }
    catch { setError(getError()); }
  };

  const runNow = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await apiClient.post('/teacher/automation/rules/run-now');
      const result = response.data?.data;
      setNotice(isEnglish
        ? `Check complete: ${result?.rulesEvaluated ?? 0} rule(s), ${result?.notificationsCreated ?? 0} new alert(s).`
        : `اكتمل الفحص: ${result?.rulesEvaluated ?? 0} قاعدة، ${result?.notificationsCreated ?? 0} تنبيه جديد.`);
      await load();
    } catch { setError(getError()); }
    finally { setBusy(false); }
  };

  const showLogs = async (rule: Rule) => { setSelectedRule(rule.id); await loadLogs(rule.id); };
  const triggerLabel = (type: string) => type === 'ABSENCE' ? tr('تكرار الغياب', 'Repeated absences') : type === 'LOW_GRADE' ? tr('انخفاض الدرجات', 'Low grades') : tr('مؤشر السلوك', 'Behavior indicator');
  const thresholdLabel = triggerType === 'ABSENCE' ? tr('عدد أيام الغياب أو أكثر', 'Absence days or more') : triggerType === 'LOW_GRADE' ? tr('المتوسط المئوي عنده أو أقل', 'Average percentage at or below') : tr('مؤشر السلوك عنده أو أقل', 'Behavior score at or below');

  return (
    <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{tr('القواعد الآلية', 'Automation rules')}</h1><p className="mt-1 text-sm text-muted-foreground">{tr('تنبيهات داخل المنصة مبنية على الغياب والدرجات والسلوك، مع سجل تنفيذ يمنع تكرار التنبيه يوميًا.', 'In-platform alerts based on attendance, grades, and behavior, with a run history that prevents duplicate daily alerts.')}</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} aria-label={tr('تحديث', 'Refresh')} className="grid size-10 place-items-center rounded-md border"><RefreshCw className="h-4 w-4" /></button><button type="button" onClick={() => void runNow()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-50"><Play className="h-4 w-4" />{tr('تشغيل الآن', 'Run now')}</button></div></header>
      {error && <p role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(290px,0.75fr)_minmax(0,1.25fr)]">
        <section className="h-fit rounded-md border bg-card p-4 md:p-5"><h2 className="mb-4 text-lg font-semibold">{tr('إنشاء قاعدة', 'Create a rule')}</h2><form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm"><span className="font-medium">{tr('اسم القاعدة', 'Rule name')}</span><input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="h-10 w-full rounded-md border bg-background px-3" /></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">{tr('المحفز', 'Trigger')}</span><select value={triggerType} onChange={(event) => setTriggerType(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="ABSENCE">{tr('تكرار الغياب', 'Repeated absences')}</option><option value="LOW_GRADE">{tr('انخفاض متوسط الدرجات', 'Low average grade')}</option><option value="BEHAVIOR">{tr('مؤشر السلوك', 'Behavior indicator')}</option></select></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">{thresholdLabel}</span><input type="number" min={0} max={triggerType === 'ABSENCE' ? 60 : 100} step="any" required value={threshold} onChange={(event) => setThreshold(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
          {triggerType === 'ABSENCE' && <label className="block space-y-1 text-sm"><span className="font-medium">{tr('خلال عدد الأيام', 'Within this many days')}</span><input type="number" min={1} max={90} value={periodDays} onChange={(event) => setPeriodDays(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>}
          <label className="block space-y-1 text-sm"><span className="font-medium">{tr('مَن يستلم التنبيه', 'Alert recipient')}</span><select value={recipient} onChange={(event) => setRecipient(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="BOTH">{tr('الطالب وولي الأمر', 'Student and parent')}</option><option value="PARENT">{tr('ولي الأمر', 'Parent')}</option><option value="STUDENT">{tr('الطالب', 'Student')}</option></select></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">{tr('نص التنبيه', 'Alert message')}</span><textarea required maxLength={500} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full rounded-md border bg-background p-3" /><span className="text-xs text-muted-foreground">{tr('يمكن استخدام', 'You can use')} {'{{studentName}}'} {tr('و', 'and')} {'{{metric}}'}.</span></label>
          <button disabled={busy} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? tr('جارٍ الحفظ...', 'Saving…') : tr('حفظ القاعدة', 'Save rule')}</button>
        </form></section>
        <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{tr('القواعد المسجلة', 'Saved rules')}</h2><span className="text-sm text-muted-foreground">{rules.length} {tr('قاعدة', 'rule(s)')}</span></div>
          {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">{tr('جارٍ التحميل...', 'Loading…')}</p> : rules.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{tr('لا توجد قواعد. أنشئ قاعدة لبدء التنبيهات.', 'No rules yet. Create one to start sending alerts.')}</p> : rules.map((rule) => <article key={rule.id} className="space-y-3 rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{rule.name}</h3><p className="mt-1 text-sm text-muted-foreground">{triggerLabel(rule.triggerType)} · {tr('الحد', 'Threshold')} {rule.condition?.threshold}{rule.triggerType === 'ABSENCE' ? isEnglish ? ` absences in ${rule.condition?.periodDays || 7} days` : ` أيام خلال ${rule.condition?.periodDays || 7} يوم` : '%'}</p><p className="mt-1 text-xs text-muted-foreground">{rule.lastRunAt ? `${tr('آخر تشغيل:', 'Last run:')} ${new Date(rule.lastRunAt).toLocaleString(isEnglish ? 'en-US' : 'ar-EG')}` : tr('لم تعمل بعد', 'Not run yet')} · {rule._count?.logs || 0} {tr('سجل', 'log(s)')}</p></div><span className={`rounded-sm px-2 py-1 text-xs ${rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>{rule.isActive ? tr('فعالة', 'Active') : tr('متوقفة', 'Paused')}</span></div>
            <div className="flex flex-wrap gap-2"><button onClick={() => void toggle(rule)} className="h-9 rounded-md border px-3 text-sm">{rule.isActive ? tr('إيقاف', 'Pause') : tr('تفعيل', 'Activate')}</button><button onClick={() => void showLogs(rule)} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><Activity className="h-4 w-4" />{tr('سجل التنفيذ', 'Run history')}</button><button onClick={() => void remove(rule)} aria-label={tr('حذف القاعدة', 'Delete rule')} className="grid size-9 place-items-center rounded-md border text-red-700"><Trash2 className="h-4 w-4" /></button></div>
          </article>)}
        </section>
      </div>
      {selectedRule && <section className="space-y-3 rounded-md border bg-card p-4"><h2 className="text-lg font-semibold">{tr('سجل التنفيذ', 'Run history')}</h2>{logs.length === 0 ? <p className="text-sm text-muted-foreground">{tr('لا توجد عمليات مسجلة حتى الآن.', 'No runs have been recorded yet.')}</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-start text-muted-foreground"><th className="py-2">{tr('الوقت', 'Time')}</th><th>{tr('معرف الطالب', 'Student ID')}</th><th>{tr('المؤشر', 'Metric')}</th><th>{tr('الحالة', 'Status')}</th></tr></thead><tbody className="divide-y">{logs.map((log) => <tr key={log.id}><td className="py-2">{new Date(log.executedAt).toLocaleString(isEnglish ? 'en-US' : 'ar-EG')}</td><td className="font-mono text-xs">{log.targetId}</td><td>{log.details?.metric ?? '—'}</td><td>{log.status === 'SUCCESS' ? tr('تم', 'Done') : tr('تعذر', 'Failed')}</td></tr>)}</tbody></table></div>}</section>}
    </main>
  );
}
