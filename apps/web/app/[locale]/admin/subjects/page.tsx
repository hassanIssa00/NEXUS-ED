'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CircleAlert, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClassHierarchyPicker } from '@/components/classes/ClassHierarchyPicker';
import { useLocale } from 'next-intl';

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
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const errorText = (reason: any, fallback: string) => {
    const message = reason?.response?.data?.message;
    return isEnglish ? (typeof message === 'string' && !/[\u0600-\u06ff]/.test(message) ? message : fallback) : (message || fallback);
  };
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [classFilterId, setClassFilterId] = useState('');
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
      setError(errorText(reason, t('تعذر تحميل بيانات المواد والفصول والمعلمين.', 'Could not load subjects, classes, and teachers.')));
    } finally {
      setLoading(false);
    }
  }, [isEnglish]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => subjects.filter((subject) => {
    if (classFilterId && subject.classId !== classFilterId) return false;
    const teacherName = subject.teacher?.name || subject.teacher?.email || '';
    return `${subject.name} ${subject.code || ''} ${subject.class?.name || ''} ${teacherName}`.toLowerCase().includes(query.toLowerCase());
  }), [subjects, query, classFilterId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
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
      setError(errorText(reason, t('تعذر حفظ المادة.', 'Could not save the subject.')));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (subject: SubjectRecord) => {
    if (!window.confirm(t(`حذف مادة ${subject.name}؟`, `Delete subject ${subject.name}?`))) return;
    setError('');
    try {
      await apiClient.delete(`/subjects/${subject.id}`);
      await load();
    } catch (reason: any) {
      setError(errorText(reason, t('تعذر حذف المادة.', 'Could not delete the subject.')));
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-5">
        <div className="flex items-center gap-3"><BookOpen className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-bold">{t('المواد الدراسية', 'Subjects')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('إدارة المواد وربطها بفصل ومعلم من بيانات المدرسة.', 'Manage subjects and assign them to a class and teacher from school records.')}</p></div></div>
        <Button onClick={openCreate} disabled={!classes.length}><Plus className="me-2 h-4 w-4" />{t('إضافة مادة', 'Add subject')}</Button>
      </header>

      {error && <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="secondary">{isEnglish ? `${subjects.length} subjects` : `${subjects.length} مادة مسجلة`}</Badge>
        <div className="relative w-full sm:max-w-sm"><Search className={`absolute ${isEnglish ? 'left-3' : 'right-3'} top-2.5 h-4 w-4 text-muted-foreground`} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('بحث بالاسم أو الرمز أو الفصل', 'Search by name, code, or class')} className={isEnglish ? 'ps-9' : 'pr-9'} /></div>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div><h2 className="font-bold">{t('تصفية المواد حسب المرحلة والفصل', 'Filter subjects by stage and class')}</h2><p className="mt-1 text-xs text-muted-foreground">{t('تعرض القوائم المراحل والصفوف والفصول المسجلة فعلًا في المدرسة.', 'The filters show stages, grades, and classes actually registered at the school.')}</p></div>
        <ClassHierarchyPicker classes={classes} value={classFilterId} onChange={setClassFilterId} locale={isEnglish ? 'en' : 'ar'} />
        {classFilterId && <Button type="button" variant="ghost" size="sm" onClick={() => setClassFilterId('')}>{t('عرض كل المواد', 'Show all subjects')}</Button>}
      </section>

      <div className="overflow-x-auto rounded-md border bg-card">
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('تحميل المواد...', 'Loading subjects…')}</div> : !filtered.length ? <p className="p-10 text-center text-sm text-muted-foreground">{t('لا توجد مواد مطابقة.', 'No matching subjects.')}</p> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start text-muted-foreground"><tr><th className="px-4 py-3 font-medium">{t('المادة', 'Subject')}</th><th className="px-4 py-3 font-medium">{t('الفصل', 'Class')}</th><th className="px-4 py-3 font-medium">{t('المعلم', 'Teacher')}</th><th className="px-4 py-3 font-medium">{t('الإجراءات', 'Actions')}</th></tr></thead>
            <tbody className="divide-y">{filtered.map((subject) => <tr key={subject.id}>
              <td className="px-4 py-3"><p className="font-medium">{subject.name}</p><p className="text-xs text-muted-foreground">{subject.code || t('لا يوجد رمز', 'No code')}</p></td>
              <td className="px-4 py-3">{subject.class?.name || '—'}</td>
              <td className="px-4 py-3">{subject.teacher?.name || subject.teacher?.email || t('غير مسند', 'Unassigned')}</td>
              <td className="px-4 py-3"><div className="flex gap-1"><Button aria-label={`${t('تعديل', 'Edit')} ${subject.name}`} title={t('تعديل', 'Edit')} variant="ghost" size="icon" onClick={() => openEdit(subject)}><Pencil className="h-4 w-4" /></Button><Button aria-label={`${t('حذف', 'Delete')} ${subject.name}`} title={t('حذف', 'Delete')} variant="ghost" size="icon" onClick={() => remove(subject)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('تعديل المادة', 'Edit subject') : t('إضافة مادة', 'Add subject')}</DialogTitle><DialogDescription>{t('ستُحفظ البيانات على خادم المدرسة وتُربط بالفصل والمعلم المحددين.', 'This information will be saved on the school server and linked to the selected class and teacher.')}</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">{t('اسم المادة', 'Subject name')}<Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="block space-y-1.5 text-sm font-medium">{t('رمز المادة (اختياري)', 'Subject code (optional)')}<Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <div className="space-y-1.5 text-sm font-medium"><span>{t('المرحلة والصف والفصل', 'Stage, grade, and class')}</span><ClassHierarchyPicker classes={classes} value={form.classId} onChange={(classId) => setForm({ ...form, classId })} locale={isEnglish ? 'en' : 'ar'} /></div>
            <label className="block space-y-1.5 text-sm font-medium">{t('المعلم (اختياري)', 'Teacher (optional)')}
              <Select value={form.teacherId || 'unassigned'} onValueChange={(teacherId) => setForm({ ...form, teacherId: teacherId === 'unassigned' ? '' : teacherId })}><SelectTrigger><SelectValue placeholder={t('اختر معلمًا', 'Choose a teacher')} /></SelectTrigger><SelectContent><SelectItem value="unassigned">{t('غير مسند', 'Unassigned')}</SelectItem>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name || teacher.email}</SelectItem>)}</SelectContent></Select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">{t('الوصف (اختياري)', 'Description (optional)')}<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-20 w-full rounded-md border bg-background p-2.5 text-sm" /></label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</Button><Button type="submit" disabled={saving || !form.classId}>{saving ? t('جارٍ الحفظ...', 'Saving…') : t('حفظ', 'Save')}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
