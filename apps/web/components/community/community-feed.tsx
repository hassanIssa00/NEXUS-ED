'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

type Audience = 'teacher' | 'student' | 'parent';
type Child = { id: string; name: string };
type ClassItem = { id: string; name: string };
type Comment = { id: string; body: string; createdAt: string; author: { name?: string; role: string; avatar?: string | null } };
type Post = { id: string; title: string; body: string; createdAt: string; authorId: string; author: { name?: string; role: string; avatar?: string | null }; class?: { name: string } | null; comments: Comment[] };
const errorText = (error: any) => error?.response?.data?.message || error?.message || 'تعذر إتمام الطلب';

export function CommunityFeed({ audience }: { audience: Audience }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [studentId, setStudentId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (audience === 'parent') {
      apiClient.get('/dashboard/parent').then(({ data }) => {
        const linked = Array.isArray(data?.children) ? data.children : [];
        setChildren(linked); setStudentId((current) => linked.some((child: Child) => child.id === current) ? current : linked[0]?.id || '');
      }).catch((caught) => setError(errorText(caught)));
    } else if (audience === 'teacher') {
      apiClient.get<ClassItem[]>('/workspace/teacher/classes').then(({ data }) => setClasses(data || [])).catch((caught) => setError(errorText(caught)));
    }
  }, [audience]);

  const load = useCallback(async () => {
    if (audience === 'parent' && !studentId) { setPosts([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const query = audience === 'parent' ? `?studentId=${encodeURIComponent(studentId)}` : '';
      const response = await apiClient.get<Post[]>(`/workspace/${audience}/community${query}`);
      setPosts(response.data || []);
    } catch (caught) { setError(errorText(caught)); }
    finally { setLoading(false); }
  }, [audience, studentId]);

  useEffect(() => { void load(); }, [load]);

  const createPost = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      await apiClient.post('/workspace/teacher/community', { title, body, classId: classId || undefined });
      setTitle(''); setBody(''); await load();
    } catch (caught) { setError(errorText(caught)); }
  };

  const sendComment = async (postId: string) => {
    const text = comments[postId]?.trim();
    if (!text) return;
    try {
      const route = audience === 'teacher' ? 'teacher' : audience;
      await apiClient.post(`/workspace/${route}/community/${postId}/comments`, audience === 'parent' ? { body: text, studentId } : { body: text });
      setComments((current) => ({ ...current, [postId]: '' })); await load();
    } catch (caught) { setError(errorText(caught)); }
  };

  const deletePost = async (post: Post) => {
    if (!window.confirm(`حذف المنشور «${post.title}»؟`)) return;
    try { await apiClient.delete(`/workspace/teacher/community/${post.id}`); await load(); }
    catch (caught) { setError(errorText(caught)); }
  };

  const heading = audience === 'parent' ? 'مجتمع الأسرة التعليمية' : audience === 'student' ? 'مجتمع المدرسة' : 'مجتمع المدرسة';
  const roleName = (role: string) => ({ TEACHER: 'معلم', STUDENT: 'طالب', PARENT: 'ولي أمر', ADMIN: 'إدارة المدرسة', PRINCIPAL: 'مدير المدرسة' }[role] || 'عضو');

  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header><h1 className="text-2xl font-bold">{heading}</h1><p className="mt-1 text-sm text-muted-foreground">منشورات ونقاشات محفوظة ضمن نطاق المدرسة أو الفصل المرتبط.</p></header>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {audience === 'parent' && children.length > 1 && <label className="block max-w-sm space-y-1 text-sm"><span className="font-medium">ملف الطالب</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3">{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
      {audience === 'teacher' && <form onSubmit={createPost} className="space-y-3 rounded-md border bg-card p-4"><h2 className="font-semibold">منشور جديد</h2><label className="block space-y-1 text-sm"><span>النطاق</span><select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">كل المدرسة</option>{classes.map((item) => <option key={item.id} value={item.id}>الفصل: {item.name}</option>)}</select></label><input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان المنشور" className="h-10 w-full rounded-md border bg-background px-3 text-sm" /><textarea required maxLength={5000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="اكتب إعلانًا أو مشاركة تعليمية..." className="w-full rounded-md border bg-background p-3 text-sm" /><button className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white"><Send className="h-4 w-4" />نشر</button></form>}
      {audience === 'parent' && !children.length && !loading && <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">اربط طالبًا بحساب ولي الأمر لعرض مجتمع فصوله.</p>}
      {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">جاري تحميل المنشورات...</p> : posts.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد منشورات منشورة ضمن هذا النطاق.</p> : <div className="space-y-4">{posts.map((post) => <article key={post.id} className="space-y-4 rounded-md border bg-card p-4 md:p-5">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{post.title}</h2><p className="mt-1 text-xs text-muted-foreground">{post.author.name || roleName(post.author.role)} · {roleName(post.author.role)}{post.class?.name ? ` · ${post.class.name}` : ' · المدرسة'} · {new Date(post.createdAt).toLocaleString('ar-EG')}</p></div>{audience === 'teacher' && <button onClick={() => void deletePost(post)} aria-label="حذف المنشور" className="grid size-9 shrink-0 place-items-center rounded-md border text-red-700"><Trash2 className="h-4 w-4" /></button>}</div>
        <p className="whitespace-pre-wrap text-sm leading-7">{post.body}</p>
        <section className="space-y-3 border-t pt-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" />التعليقات ({post.comments.length})</h3>{post.comments.map((comment) => <div key={comment.id} className="rounded-md bg-muted/40 p-3"><p className="text-xs font-medium">{comment.author.name || roleName(comment.author.role)} · {roleName(comment.author.role)} <time className="font-normal text-muted-foreground">{new Date(comment.createdAt).toLocaleString('ar-EG')}</time></p><p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p></div>)}<div className="flex gap-2"><input value={comments[post.id] || ''} onChange={(event) => setComments((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={2000} placeholder="أضف تعليقًا..." className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" /><button onClick={() => void sendComment(post.id)} aria-label="إرسال التعليق" className="grid size-10 shrink-0 place-items-center rounded-md bg-teal-700 text-white"><Send className="h-4 w-4" /></button></div></section>
      </article>)}</div>}
    </main>
  );
}
