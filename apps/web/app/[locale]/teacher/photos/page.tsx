'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AlertCircle, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';

type ClassItem = { id: string; name: string };
type EventItem = { id: string; title: string; description?: string; eventType: string; startsAt?: string | null; class: { name: string }; photos: string[] };
type UploadedFile = { reference: string; url: string };

function message(error: any) {
  const value = error?.response?.data?.message;
  return Array.isArray(value) ? value.join('، ') : value || error?.message || 'تعذر إتمام الطلب';
}

export default function TeacherPhotosPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('PHOTO_ALBUM');
  const [startsAt, setStartsAt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [classResponse, eventResponse] = await Promise.all([
        apiClient.get<ClassItem[]>('/workspace/teacher/classes'),
        apiClient.get<EventItem[]>('/workspace/teacher/events'),
      ]);
      setClasses(classResponse.data || []);
      setEvents(eventResponse.data || []);
    } catch (caught) { setError(message(caught)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      let photoReferences: string[] = [];
      if (files.length) {
        const data = new FormData();
        files.forEach((file) => data.append('files', file));
        const uploaded = await apiClient.post<UploadedFile[]>('/upload/files', data);
        photoReferences = (uploaded.data || []).map((item) => item.reference);
        if (photoReferences.length !== files.length) throw new Error('لم يكتمل رفع كل الصور؛ لم يتم حفظ الفعالية');
      }
      await apiClient.post('/workspace/teacher/events', {
        classId, title, description, eventType,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        photoReferences,
      });
      setTitle(''); setDescription(''); setStartsAt(''); setFiles([]);
      const input = document.getElementById('class-event-files') as HTMLInputElement | null;
      if (input) input.value = '';
      await load();
    } catch (caught) { setError(message(caught)); }
    finally { setSaving(false); }
  };

  const remove = async (item: EventItem) => {
    if (!window.confirm(`حذف «${item.title}»؟`)) return;
    try { await apiClient.delete(`/workspace/teacher/events/${item.id}`); await load(); }
    catch (caught) { setError(message(caught)); }
  };

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">صور وفعاليات الفصل</h1><p className="mt-1 text-sm text-muted-foreground">سجل فعاليات فصولك وشارك الصور مع الطلاب وأولياء أمورهم.</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><RefreshCw className="h-4 w-4" /> تحديث</button>
      </header>
      {error && <div role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
        <section className="h-fit rounded-md border bg-card p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2"><ImagePlus className="h-5 w-5 text-teal-700" /><h2 className="text-lg font-semibold">إضافة فعالية</h2></div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1 text-sm"><span className="font-medium">الفصل</span><select required value={classId} onChange={(event) => setClassId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">اختر فصلاً</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">العنوان</span><input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">النوع</span><select value={eventType} onChange={(event) => setEventType(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="PHOTO_ALBUM">ألبوم صور</option><option value="CLASS_EVENT">فعالية صفية</option><option value="ANNOUNCEMENT">إعلان</option></select></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">الموعد</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">التفاصيل</span><textarea rows={4} maxLength={3000} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-md border bg-background p-3" /></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">الصور</span><input id="class-event-files" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 10))} className="block w-full rounded-md border bg-background p-2 text-sm" /><span className="text-xs text-muted-foreground">حتى 10 صور، بحد أقصى 15 ميجابايت للصورة.</span></label>
            {files.length > 0 && <p className="text-xs text-muted-foreground">{files.length} صورة مختارة</p>}
            <button disabled={saving || classes.length === 0} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{saving ? 'جارٍ الرفع والحفظ...' : 'حفظ ونشر'}</button>
          </form>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">أرشيف الفصل</h2><span className="text-sm text-muted-foreground">{events.length} عنصر</span></div>
          {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">جاري التحميل...</p> : events.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد فعاليات أو صور بعد.</p> : <div className="grid gap-4 sm:grid-cols-2">
            {events.map((item) => <article key={item.id} className="overflow-hidden rounded-md border bg-card">
              {item.photos?.length > 0 ? <div className="grid aspect-[16/9] grid-cols-2 gap-1 overflow-hidden bg-muted">{item.photos.slice(0, 4).map((photo, index) => <img key={`${item.id}-${index}`} src={photo} alt={`${item.title} ${index + 1}`} className="h-full min-h-0 w-full object-cover" />)}</div> : <div className="grid aspect-[16/9] place-items-center bg-muted/50 text-muted-foreground"><ImagePlus className="h-8 w-8" /></div>}
              <div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{item.title}</h3><p className="text-xs text-muted-foreground">{item.class?.name} · {item.eventType === 'ANNOUNCEMENT' ? 'إعلان' : item.eventType === 'PHOTO_ALBUM' ? 'ألبوم صور' : 'فعالية صفية'}</p></div><button type="button" onClick={() => void remove(item)} className="grid size-8 shrink-0 place-items-center rounded-md border text-red-700" aria-label="حذف الفعالية"><Trash2 className="h-4 w-4" /></button></div>
                {item.startsAt && <p className="text-xs text-muted-foreground">{new Date(item.startsAt).toLocaleString('ar-EG')}</p>}{item.description && <p className="line-clamp-3 text-sm">{item.description}</p>}
              </div>
            </article>)}
          </div>}
        </section>
      </div>
    </main>
  );
}
