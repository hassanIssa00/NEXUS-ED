'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Award, Download, RefreshCw } from 'lucide-react';

type ClassItem = { id: string; name: string };
type Student = { id: string; name?: string; email: string };
type Certificate = { id: string; serial: string; title: string; description?: string; createdAt: string; student: { id: string; name?: string; email: string } };
const getError = (error: any) => error?.response?.data?.message || error?.message || 'تعذر إتمام الطلب';

export default function TeacherCertificatesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('شهادة تميز');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [classResponse, certificateResponse] = await Promise.all([
        apiClient.get<ClassItem[]>('/workspace/teacher/classes'),
        apiClient.get<Certificate[]>('/workspace/teacher/certificates'),
      ]);
      setClasses(classResponse.data || []); setCertificates(certificateResponse.data || []);
    } catch (caught) { setError(getError(caught)); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const changeClass = async (id: string) => {
    setClassId(id); setStudentId(''); setStudents([]);
    if (!id) return;
    try {
      const response = await apiClient.get<Student[]>(`/workspace/teacher/classes/${id}/students`);
      setStudents(response.data || []);
    } catch (caught) { setError(getError(caught)); }
  };

  const issue = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await apiClient.post('/workspace/teacher/certificates', { classId, studentId, title, description });
      setDescription(''); await load();
    } catch (caught) { setError(getError(caught)); }
    finally { setBusy(false); }
  };

  const download = async (certificate: Certificate) => {
    try {
      const response = await apiClient.get(`/workspace/certificates/${certificate.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${certificate.serial}.pdf`; anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) { setError(getError(caught)); }
  };

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">إصدار الشهادات</h1><p className="mt-1 text-sm text-muted-foreground">أصدر شهادة لطالب في فصولك واحتفظ بسجل ورقم تحقق وملف PDF للطباعة.</p></div><button onClick={() => void load()} aria-label="تحديث" className="grid size-10 place-items-center rounded-md border"><RefreshCw className="h-4 w-4" /></button></header>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
        <section className="h-fit rounded-md border bg-card p-4 md:p-5"><div className="mb-4 flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /><h2 className="text-lg font-semibold">شهادة جديدة</h2></div><form onSubmit={issue} className="space-y-4">
          <label className="block space-y-1 text-sm"><span className="font-medium">الفصل</span><select required value={classId} onChange={(event) => void changeClass(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">اختر فصلاً</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">الطالب</span><select required value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">اختر طالبًا</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name || item.email}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">عنوان الشهادة</span><input required value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">سبب التكريم</span><textarea value={description} maxLength={1000} rows={3} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-md border bg-background p-3" /></label>
          <button disabled={busy || !students.length} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? 'جارٍ الإصدار...' : 'إصدار الشهادة'}</button>
        </form></section>
        <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">سجل الشهادات</h2><span className="text-sm text-muted-foreground">{certificates.length} شهادة</span></div>
          {certificates.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد شهادات صادرة بعد.</p> : <div className="divide-y rounded-md border bg-card">{certificates.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="min-w-0"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.student.name || item.student.email} · {new Date(item.createdAt).toLocaleDateString('ar-EG')}</p><p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">{item.serial}</p>{item.description && <p className="mt-1 text-sm">{item.description}</p>}</div><button onClick={() => void download(item)} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><Download className="h-4 w-4" /> PDF للطباعة</button></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
