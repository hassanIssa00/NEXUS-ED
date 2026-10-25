'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AlertCircle, ExternalLink, Link2, RefreshCw, Trash2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { TimeSelect } from '@/components/ui/time-select';
import { useLocale } from 'next-intl';

type ClassItem = { id: string; name: string };
type EventItem = { id: string; title: string; description?: string; externalUrl?: string | null; eventType: string; startsAt?: string | null; class: { name: string }; photos: string[] };

function message(error: any, isEnglish: boolean) {
  const value = error?.response?.data?.message;
  const result = Array.isArray(value) ? value.join(isEnglish ? ', ' : '، ') : value || error?.message;
  if (isEnglish) return typeof result === 'string' && !/[\u0600-\u06ff]/.test(result) ? result : 'The request could not be completed.';
  return result || 'تعذر إتمام الطلب';
}

export default function TeacherPhotosPage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('PHOTO_ALBUM');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
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
    } catch (caught) { setError(message(caught, isEnglish)); }
    finally { setLoading(false); }
  }, [isEnglish]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (Boolean(eventDate) !== Boolean(eventTime)) throw new Error(t('اختر التاريخ والوقت معًا أو اترك الموعد فارغًا.', 'Choose both a date and time, or leave the schedule empty.'));
      await apiClient.post('/workspace/teacher/events', {
        classId, title, description, eventType,
        externalUrl: externalUrl.trim() || undefined,
        startsAt: eventDate && eventTime ? new Date(`${eventDate}T${eventTime}:00`).toISOString() : undefined,
      });
      setTitle(''); setDescription(''); setExternalUrl(''); setEventDate(''); setEventTime('');
      await load();
    } catch (caught) { setError(message(caught, isEnglish)); }
    finally { setSaving(false); }
  };

  const remove = async (item: EventItem) => {
    if (!window.confirm(t(`حذف «${item.title}»؟`, `Delete “${item.title}”?`))) return;
    try { await apiClient.delete(`/workspace/teacher/events/${item.id}`); await load(); }
    catch (caught) { setError(message(caught, isEnglish)); }
  };

  return (
    <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{t('فعاليات وروابط الفصل', 'Class events and links')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('أضف رابط المحتوى وسيصل للطلاب وأولياء أمورهم ليفتحوه مباشرة.', 'Share a link with students and their parents so they can open it directly.')}</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><RefreshCw className="h-4 w-4" /> {t('تحديث', 'Refresh')}</button>
      </header>
      {error && <div role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
        <section className="h-fit rounded-md border bg-card p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2"><Link2 className="h-5 w-5 text-teal-700" /><h2 className="text-lg font-semibold">{t('إضافة رابط للفصل', 'Add a class link')}</h2></div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1 text-sm"><span className="font-medium">{t('الفصل', 'Class')}</span><select required value={classId} onChange={(event) => setClassId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">{t('اختر فصلاً', 'Choose a class')}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">{t('العنوان', 'Title')}</span><input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">{t('نوع المنشور', 'Post type')}</span><select value={eventType} onChange={(event) => setEventType(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="CLASS_EVENT">{t('فعالية صفية', 'Class event')}</option><option value="ANNOUNCEMENT">{t('إعلان', 'Announcement')}</option><option value="PHOTO_ALBUM">{t('رابط خارجي', 'External link')}</option></select></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm"><span className="font-medium">{t('التاريخ', 'Date')}</span><DatePicker value={eventDate} onChange={setEventDate} placeholder={t('اختر التاريخ', 'Choose a date')} minDate={new Date()} locale={isEnglish ? 'en' : 'ar'} /></label><label className="block space-y-1 text-sm"><span className="font-medium">{t('الوقت', 'Time')}</span><TimeSelect value={eventTime} onChange={setEventTime} placeholder={t('اختر الوقت', 'Choose a time')} disabled={!eventDate} /></label></div>
            <label className="block space-y-1 text-sm"><span className="font-medium">{t('التفاصيل', 'Details')}</span><textarea rows={4} maxLength={3000} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-md border bg-background p-3" /></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">{t('الرابط', 'Link')}</span><input required type="url" inputMode="url" dir="ltr" placeholder="https://..." value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-left" /><span className="text-xs text-muted-foreground">{t('أضف الرابط؛ سيفتحه الطالب وولي الأمر مباشرة.', 'Add the link; students and parents can open it directly.')}</span></label>
            <button disabled={saving || classes.length === 0} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{saving ? t('جارٍ الحفظ...', 'Saving…') : t('حفظ ونشر', 'Save and publish')}</button>
          </form>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{t('أرشيف الفصل', 'Class archive')}</h2><span className="text-sm text-muted-foreground">{events.length} {t('عنصر', 'items')}</span></div>
          {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">{t('جاري التحميل...', 'Loading…')}</p> : events.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{t('لا توجد فعاليات منشورة بعد.', 'No events have been published yet.')}</p> : <div className="grid gap-4 sm:grid-cols-2">
            {events.map((item) => <article key={item.id} className="overflow-hidden rounded-md border bg-card">
              <div className="grid aspect-[16/9] place-items-center bg-muted/50 text-muted-foreground"><Link2 className="h-8 w-8" /></div>
              <div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{item.title}</h3><p className="text-xs text-muted-foreground">{item.class?.name} · {item.eventType === 'ANNOUNCEMENT' ? t('إعلان', 'Announcement') : item.eventType === 'PHOTO_ALBUM' ? t('رابط خارجي', 'External link') : t('فعالية صفية', 'Class event')}</p></div><button type="button" onClick={() => void remove(item)} className="grid size-8 shrink-0 place-items-center rounded-md border text-red-700" aria-label={t('حذف الفعالية', 'Delete event')}><Trash2 className="h-4 w-4" /></button></div>
                {item.startsAt && <p className="text-xs text-muted-foreground">{new Date(item.startsAt).toLocaleString(isEnglish ? 'en-US' : 'ar-EG')}</p>}{item.description && <p className="line-clamp-3 text-sm">{item.description}</p>}
                {item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"><ExternalLink className="h-4 w-4" />{t('فتح الرابط', 'Open link')}</a>}
              </div>
            </article>)}
          </div>}
        </section>
      </div>
    </main>
  );
}
