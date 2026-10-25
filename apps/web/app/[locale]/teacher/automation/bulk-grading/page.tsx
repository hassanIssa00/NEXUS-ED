'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight, Loader2, Save } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Assignment { id: string; title: string; maxScore: number; subject?: { name?: string } }
interface Submission { id: string; grade?: number | null; score?: number | null; feedback?: string | null; student?: { name?: string | null; email: string } }

export default function BulkGradingAutomation() {
  const isEnglish = useLocale() === 'en';
  const tr = (ar: string, en: string) => isEnglish ? en : ar;
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
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

  const loadSubmissions = async (id: string) => {
    if (!id) return;
    setLoadingSubmissions(true);
    setNotice('');
    try {
      const { data } = await apiClient.get(`/assignments/${id}/submissions`);
      const rows: Submission[] = Array.isArray(data) ? data : [];
      setSubmissions(rows);
      setScores(Object.fromEntries(rows.map((item) => [item.id, String(item.grade ?? item.score ?? '')])));
      setFeedback(Object.fromEntries(rows.map((item) => [item.id, item.feedback || ''])));
      setLoadFailed(false);
    } catch {
      setSubmissions([]);
      setLoadFailed(true);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleAssignmentChange = (id: string) => {
    setAssignmentId(id);
    setSubmissions([]);
    void loadSubmissions(id);
  };

  const selectedAssignment = assignments.find((item) => item.id === assignmentId);

  const saveGrades = async () => {
    if (!selectedAssignment) return;
    const changed = submissions.filter((item) => {
      const value = scores[item.id]?.trim();
      return value !== '' && Number(value) !== Number(item.grade ?? item.score ?? NaN);
    });
    if (changed.some((item) => {
      const value = Number(scores[item.id]);
      return !Number.isFinite(value) || value < 0 || value > selectedAssignment.maxScore;
    })) {
      setNotice(tr(`أدخل درجات من 0 إلى ${selectedAssignment.maxScore}.`, `Enter scores from 0 to ${selectedAssignment.maxScore}.`));
      return;
    }
    if (changed.length === 0) {
      setNotice(tr('لا توجد درجات جديدة للحفظ.', 'There are no new scores to save.'));
      return;
    }

    setSaving(true);
    let savedCount = 0;
    try {
      for (const item of changed) {
        await apiClient.patch(`/assignments/submissions/${item.id}/grade`, {
          score: Number(scores[item.id]),
          feedback: feedback[item.id] || undefined,
        });
        savedCount += 1;
      }
      setNotice(tr(`تم حفظ ${savedCount} درجة في النظام.`, `Saved ${savedCount} score(s).`));
      await loadSubmissions(assignmentId);
    } catch {
      setNotice(savedCount ? tr(`تم حفظ ${savedCount} درجة، وتعذر حفظ بقية التغييرات.`, `Saved ${savedCount} score(s), but could not save the remaining changes.`) : tr('تعذر حفظ الدرجات.', 'Could not save the scores.'));
      setLoadFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="flex items-center gap-4">
        <Link href="/teacher/automation"><Button variant="outline" size="icon" aria-label={tr('العودة', 'Back')}><ArrowRight className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-2xl font-bold">{tr('رصد الدرجات', 'Grade submissions')}</h1><p className="mt-1 text-sm text-muted-foreground">{tr('تعديل وحفظ درجات التسليمات الفعلية للتكليفات المسندة لك.', 'Review and save grades for assignments assigned to you.')}</p></div>
      </header>

      {loadFailed && <p role="alert" className="text-sm text-destructive">{tr('تعذر تحميل بعض البيانات من النظام.', 'Could not load some data.')}</p>}

      <Card>
        <CardContent className="max-w-xl space-y-2 p-5">
          <label className="text-sm font-medium">{tr('الواجب', 'Assignment')}</label>
          <Select value={assignmentId} onValueChange={handleAssignmentChange}>
            <SelectTrigger><SelectValue placeholder={loading ? tr('جاري التحميل...', 'Loading…') : tr('اختر واجبًا مسندًا لك', 'Select an assigned assignment')} /></SelectTrigger>
            <SelectContent>{assignments.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent>
          </Select>
          {!loading && assignments.length === 0 && <p className="text-sm text-muted-foreground">{tr('لا توجد تكليفات مسجلة لهذا الحساب.', 'No assignments are linked to this account.')}</p>}
        </CardContent>
      </Card>

      {assignmentId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div><CardTitle className="text-base">{tr('التسليمات', 'Submissions')}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{selectedAssignment?.subject?.name || ''} · {tr('الحد الأعلى', 'Maximum score')} {selectedAssignment?.maxScore ?? '—'}</p></div>
            <Button onClick={saveGrades} disabled={saving || loadingSubmissions || !submissions.length}>
              {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
              {tr('حفظ الدرجات', 'Save grades')}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSubmissions ? <p className="py-8 text-center text-sm text-muted-foreground">{tr('جاري تحميل التسليمات...', 'Loading submissions…')}</p>
              : submissions.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{tr('لا توجد تسليمات مسجلة لهذا الواجب.', 'No submissions have been received for this assignment.')}</p>
              : <div className="divide-y">{submissions.map((item) => (
                <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_120px_2fr] sm:items-center">
                  <div><p className="font-medium">{item.student?.name || item.student?.email || 'اسم غير متاح'}</p><p className="text-xs text-muted-foreground">{item.student?.email}</p></div>
                  <Input aria-label={`${tr('درجة', 'Score for')} ${item.student?.name || item.student?.email || ''}`} type="number" min={0} max={selectedAssignment?.maxScore} value={scores[item.id] ?? ''} onChange={(event) => setScores((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={tr('الدرجة', 'Score')} />
                  <Input aria-label={tr('ملاحظات التصحيح', 'Grading feedback')} value={feedback[item.id] ?? ''} onChange={(event) => setFeedback((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={tr('ملاحظة اختيارية', 'Optional feedback')} />
                 </div>
               ))}
               </div>}
              {notice && <p role="status" className="mt-4 text-sm text-muted-foreground">{notice}</p>}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
