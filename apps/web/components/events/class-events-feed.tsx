'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Camera } from 'lucide-react';

type Audience = 'student' | 'parent';
type Child = { id: string; name: string };
type EventItem = { id: string; title: string; description?: string; eventType: string; startsAt?: string | null; createdAt: string; class: { name: string }; teacher: { name?: string }; photos: string[] };
const errorText = (error: any) => error?.response?.data?.message || error?.message || 'تعذر تحميل الفعاليات';

export function ClassEventsFeed({ audience }: { audience: Audience }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [studentId, setStudentId] = useState('');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (audience !== 'parent') return;
    apiClient.get('/dashboard/parent').then(({ data }) => {
      const linked = Array.isArray(data?.children) ? data.children : [];
      setChildren(linked);
      setStudentId((current) => linked.some((child: Child) => child.id === current) ? current : linked[0]?.id || '');
    }).catch((caught) => setError(errorText(caught)));
  }, [audience]);

  const load = useCallback(async () => {
    if (audience === 'parent' && !studentId) { setEvents([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const query = audience === 'parent' ? `?studentId=${encodeURIComponent(studentId)}` : '';
      const response = await apiClient.get<EventItem[]>(`/workspace/${audience}/events${query}`);
      setEvents(response.data || []);
    } catch (caught) { setError(errorText(caught)); }
    finally { setLoading(false); }
  }, [audience, studentId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-3"><Camera className="h-7 w-7 text-teal-700" /><div><h1 className="text-2xl font-bold">فعاليات وصور الفصل</h1><p className="mt-1 text-sm text-muted-foreground">صور ومشاركات نشرها معلمو الفصول المرتبطة.</p></div></header>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {audience === 'parent' && children.length > 1 && <label className="block max-w-sm space-y-1 text-sm"><span className="font-medium">ملف الطالب</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3">{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
      {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">جاري التحميل...</p> : events.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد صور أو فعاليات منشورة لفصول هذا الطالب.</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{events.map((item) => <article key={item.id} className="overflow-hidden rounded-md border bg-card">
        {item.photos.length > 0 ? <div className="grid aspect-[4/3] grid-cols-2 gap-1 bg-muted">{item.photos.slice(0, 4).map((photo, index) => <a key={index} href={photo} target="_blank" rel="noreferrer" className="min-h-0 min-w-0"><img src={photo} alt={`${item.title} ${index + 1}`} className="h-full w-full object-cover" loading="lazy" /></a>)}</div> : <div className="grid aspect-[4/3] place-items-center bg-muted/40 text-muted-foreground"><Camera className="h-9 w-9" /></div>}
        <div className="space-y-2 p-4"><span className="text-xs font-medium text-teal-700">{item.class?.name}</span><h2 className="font-semibold">{item.title}</h2>{item.description && <p className="whitespace-pre-wrap text-sm leading-6">{item.description}</p>}<p className="text-xs text-muted-foreground">{item.teacher?.name || 'معلم الفصل'} · {new Date(item.startsAt || item.createdAt).toLocaleDateString('ar-EG')}</p></div>
      </article>)}</div>}
    </main>
  );
}
