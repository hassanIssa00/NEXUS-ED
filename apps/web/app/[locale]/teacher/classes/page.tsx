'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/routing';
import { BookOpen, CircleAlert, ClipboardList, Loader2, Search, Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from 'next-intl';

type Student = { id: string; name?: string | null; email?: string | null; avatar?: string | null };
type SchoolClass = { id: string; name: string; _count?: { students?: number } };

function fullName(student: Student, isEnglish: boolean) {
  return student.name?.trim() || student.email || (isEnglish ? 'Name not provided' : 'اسم غير مسجل');
}

export default function TeacherClassesPage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const serverError = (reason: any, fallback: string) => {
    const message = reason?.response?.data?.message;
    return isEnglish ? (typeof message === 'string' && !/[\u0600-\u06ff]/.test(message) ? message : fallback) : (message || fallback);
  };
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get<SchoolClass[]>('/workspace/teacher/classes')
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : [];
        setClasses(rows);
        setClassId(rows[0]?.id || '');
      })
      .catch((reason) => { if (active) setError(serverError(reason, t('تعذر تحميل الفصول.', 'Could not load classes.'))); })
      .finally(() => { if (active) setLoadingClasses(false); });
    return () => { active = false; };
  }, [isEnglish]);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    let active = true;
    setLoadingStudents(true);
    setError('');
    apiClient.get<Student[]>(`/workspace/teacher/classes/${encodeURIComponent(classId)}/students`)
      .then(({ data }) => { if (active) setStudents(Array.isArray(data) ? data : []); })
      .catch((reason) => { if (active) { setStudents([]); setError(serverError(reason, t('تعذر تحميل طلاب الفصل.', 'Could not load class students.'))); } })
      .finally(() => { if (active) setLoadingStudents(false); });
    return () => { active = false; };
  }, [classId, isEnglish]);

  const selectedClass = classes.find((item) => item.id === classId);
  const filteredStudents = useMemo(() => students.filter((student) =>
    `${fullName(student, isEnglish)} ${student.email || ''}`.toLocaleLowerCase(isEnglish ? 'en' : 'ar').includes(search.trim().toLocaleLowerCase(isEnglish ? 'en' : 'ar')),
  ), [students, search, isEnglish]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Users className="size-6" /></span><div><h1 className="text-2xl font-bold">{t('فصولي الدراسية', 'My classes')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('قائمة الفصول والطلاب المرتبطين بحسابك.', 'Classes and students linked to your account.')}</p></div></div>
        <nav className="flex flex-wrap gap-2">
          <Link href="/teacher/assignments" className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted"><BookOpen className="size-4" />{t('الواجبات', 'Assignments')}</Link>
          <Link href="/teacher/grading" className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted"><ClipboardList className="size-4" />{t('التسليمات', 'Submissions')}</Link>
          <Link href="/teacher/reports" className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted">{t('التقارير', 'Reports')}</Link>
        </nav>
      </header>

      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="size-4" />{error}</p>}

      <section className="rounded-2xl border bg-card p-5">
        <label className="block max-w-xl space-y-2 text-sm font-semibold"><span>{t('الفصل الدراسي', 'Class')}</span><Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue placeholder={loadingClasses ? t('جاري تحميل الفصول...', 'Loading classes…') : t('اختر فصلًا', 'Choose a class')} /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></label>
      </section>

      {selectedClass && <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-bold">{selectedClass.name}</h2><p className="mt-1 text-sm text-muted-foreground">{isEnglish ? `${students.length} students` : `${students.length} طالبًا`}</p></div>
          <label className="relative w-full sm:max-w-sm"><Search className={`absolute ${isEnglish ? 'left-3' : 'right-3'} top-3 size-4 text-muted-foreground`} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('ابحث باسم الطالب أو بريده', 'Search by student name or email')} className={isEnglish ? 'ps-9' : 'pr-9'} /></label>
        </div>
        {loadingStudents ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('تحميل الطلاب...', 'Loading students…')}</div> : filteredStudents.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">{students.length ? t('لا توجد نتائج مطابقة.', 'No matching students.') : t('لا يوجد طلاب مسجلون في هذا الفصل.', 'No students are enrolled in this class.')}</p> : <ul className="divide-y">{filteredStudents.map((student) => <li key={student.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">{student.avatar ? <img src={student.avatar} alt={`${t('صورة', 'Photo')} ${fullName(student, isEnglish)}`} className="size-10 rounded-full bg-white object-cover" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-bold">{fullName(student, isEnglish).slice(0, 1)}</span>}<div className="min-w-0"><Link href={`/teacher/students/${student.id}` as never} className="block truncate font-semibold text-primary hover:underline">{fullName(student, isEnglish)}</Link><span className="block truncate text-xs text-muted-foreground">{student.email || '—'}</span></div></div>
          <Link href={`/teacher/students/${student.id}` as never} className="inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted">{t('فتح ملف الطالب', 'Open student profile')}</Link>
        </li>)}</ul>}
      </section>}
    </main>
  );
}
