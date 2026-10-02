'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CircleAlert, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ClassRecord = { id: string; name: string };
type TeacherRecord = { id: string; name?: string | null; email: string };
type SubjectRecord = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  classId: string;
  teacherId?: string | null;
  class?: ClassRecord;
  teacher?: TeacherRecord | null;
};

const emptyForm = { name: '', code: '', description: '', classId: '', teacherId: '' };
const responseData = (response: any) => response?.data?.data ?? response?.data;

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subjectResponse, classResponse, teacherResponse] = await Promise.all([
        apiClient.get('/subjects'),
        apiClient.get('/classes'),
        apiClient.get('/users/staff', { params: { role: 'TEACHER', page: 1, limit: 100 } }),
      ]);
      const subjectRows = responseData(subjectResponse);
      const classRows = responseData(classResponse);
      const teacherRows = teacherResponse.data?.data ?? responseData(teacherResponse);
      setSubjects(Array.isArray(subjectRows) ? subjectRows : []);
      setClasses(Array.isArray(classRows) ? classRows : []);
      setTeachers(Array.isArray(teacherRows) ? teacherRows : []);
    } catch (reason: any) {
      setSubjects([]);
      setClasses([]);
      setTeachers([]);
      setError(reason?.response?.data?.message || 'تعذر تحميل بيانات المواد والفصول والمعلمين.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => subjects.filter((subject) => {
    const teacherName = subject.teacher?.name || subject.teacher?.email || '';
    return `${subject.name} ${subject.code || ''} ${subject.class?.name || ''} ${teacherName}`.toLowerCase().includes(query.toLowerCase());
  }), [subjects, query]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, classId: classes[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (subject: SubjectRecord) => {
    setEditing(subject);
    setForm({ name: subject.name, code: subject.code || '', description: subject.description || '', classId: subject.classId, teacherId: subject.teacherId || '' });
    setModalOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = { ...form, code: form.code || undefined, description: form.description || undefined, teacherId: form.teacherId || undefined };
    try {
      if (editing) await apiClient.patch(`/subjects/${editing.id}`, payload);
      else await apiClient.post('/subjects', payload);
      setModalOpen(false);
      await load();
    } catch (reason: any) {
      setError(reason?.response?.data?.message || 'تعذر حفظ المادة.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (subject: SubjectRecord) => {
    if (!window.confirm(`حذف مادة ${subject.name}؟`)) return;
    setError('');
    try {
      await apiClient.delete(`/subjects/${subject.id}`);
      await load();
    } catch (reason: any) {
      setError(reason?.response?.data?.message || 'تعذر حذف المادة.');
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-5">
        <div className="flex items-center gap-3"><BookOpen className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-bold">المواد الدراسية</h1><p className="mt-1 text-sm text-muted-foreground">إدارة المواد وربطها بفصل ومعلم من بيانات المدرسة.</p></div></div>
        <Button onClick={openCreate} disabled={!classes.length}><Plus className="ml-2 h-4 w-4" />إضافة مادة</Button>
      </header>

      {error && <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="secondary">{subjects.length} مادة مسجلة</Badge>
        <div className="relative w-full sm:max-w-sm"><Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو الرمز أو الفصل" className="pr-9" /></div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل المواد...</div> : !filtered.length ? <p className="p-10 text-center text-sm text-muted-foreground">لا توجد مواد مطابقة.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-right text-muted-foreground"><tr><th className="px-4 py-3 font-medium">المادة</th><th className="px-4 py-3 font-medium">الفصل</th><th className="px-4 py-3 font-medium">المعلم</th><th className="px-4 py-3 font-medium">الإجراءات</th></tr></thead>
            <tbody className="divide-y">{filtered.map((subject) => <tr key={subject.id}>
              <td className="px-4 py-3"><p className="font-medium">{subject.name}</p><p className="text-xs text-muted-foreground">{subject.code || 'لا يوجد رمز'}</p></td>
              <td className="px-4 py-3">{subject.class?.name || '—'}</td>
              <td className="px-4 py-3">{subject.teacher?.name || subject.teacher?.email || 'غير مسند'}</td>
              <td className="px-4 py-3"><div className="flex gap-1"><Button aria-label={`تعديل ${subject.name}`} title="تعديل" variant="ghost" size="icon" onClick={() => openEdit(subject)}><Pencil className="h-4 w-4" /></Button><Button aria-label={`حذف ${subject.name}`} title="حذف" variant="ghost" size="icon" onClick={() => remove(subject)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'تعديل المادة' : 'إضافة مادة'}</DialogTitle><DialogDescription>ستُحفظ البيانات على خادم المدرسة وتُربط بالفصل والمعلم المحددين.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">اسم المادة<Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="block space-y-1.5 text-sm font-medium">رمز المادة (اختياري)<Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <label className="block space-y-1.5 text-sm font-medium">الفصل
              <Select value={form.classId} onValueChange={(classId) => setForm({ ...form, classId })}><SelectTrigger><SelectValue placeholder="اختر فصلًا" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">المعلم (اختياري)
              <Select value={form.teacherId || 'unassigned'} onValueChange={(teacherId) => setForm({ ...form, teacherId: teacherId === 'unassigned' ? '' : teacherId })}><SelectTrigger><SelectValue placeholder="اختر معلمًا" /></SelectTrigger><SelectContent><SelectItem value="unassigned">غير مسند</SelectItem>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name || teacher.email}</SelectItem>)}</SelectContent></Select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">الوصف (اختياري)<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-20 w-full rounded-md border bg-background p-2.5 text-sm" /></label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button><Button type="submit" disabled={saving || !form.classId}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
