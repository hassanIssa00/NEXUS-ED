'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

type Audience = 'teacher' | 'student' | 'parent';
type Child = { id: string; name: string };
type ClassItem = { id: string; name: string };
type Comment = { id: string; body: string; createdAt: string; author: { name?: string; role: string; avatar?: string | null } };
type Post = { id: string; title: string; body: string; createdAt: string; authorId: string; author: { name?: string; role: string; avatar?: string | null }; class?: { name: string } | null; comments: Comment[] };
const errorText = (error: any, isEnglish: boolean) => {
  const message = error?.response?.data?.message || error?.message;
  if (typeof message === 'string' && !(isEnglish && /[\u0600-\u06ff]/.test(message))) return message;
  return isEnglish ? 'Could not complete the request. Please try again.' : 'تعذر إتمام الطلب. حاول مرة أخرى.';
};

export function CommunityFeed({ audience }: { audience: Audience }) {
  const isEnglish = useLocale() === 'en';
  const copy = (ar: string, en: string) => isEnglish ? en : ar;
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
      }).catch((caught) => setError(errorText(caught, isEnglish)));
    } else if (audience === 'teacher') {
      apiClient.get<ClassItem[]>('/workspace/teacher/classes').then(({ data }) => setClasses(data || [])).catch((caught) => setError(errorText(caught, isEnglish)));
    }
  }, [audience, isEnglish]);

  const load = useCallback(async () => {
    if (audience === 'parent' && !studentId) { setPosts([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const query = audience === 'parent' ? `?studentId=${encodeURIComponent(studentId)}` : '';
      const response = await apiClient.get<Post[]>(`/workspace/${audience}/community${query}`);
      setPosts(response.data || []);
    } catch (caught) { setError(errorText(caught, isEnglish)); }
    finally { setLoading(false); }
  }, [audience, studentId, isEnglish]);

  useEffect(() => { void load(); }, [load]);

  const createPost = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      await apiClient.post('/workspace/teacher/community', { title, body, classId: classId || undefined });
      setTitle(''); setBody(''); await load();
    } catch (caught) { setError(errorText(caught, isEnglish)); }
  };

  const sendComment = async (postId: string) => {
    const text = comments[postId]?.trim();
    if (!text) return;
    try {
      const route = audience === 'teacher' ? 'teacher' : audience;
      await apiClient.post(`/workspace/${route}/community/${postId}/comments`, audience === 'parent' ? { body: text, studentId } : { body: text });
      setComments((current) => ({ ...current, [postId]: '' })); await load();
    } catch (caught) { setError(errorText(caught, isEnglish)); }
  };

  const deletePost = async (post: Post) => {
    if (!window.confirm(isEnglish ? `Delete the post “${post.title}”?` : `حذف المنشور «${post.title}»؟`)) return;
    try { await apiClient.delete(`/workspace/teacher/community/${post.id}`); await load(); }
    catch (caught) { setError(errorText(caught, isEnglish)); }
  };

  const heading = audience === 'parent' ? copy('مجتمع الأسرة التعليمية', 'School community for families') : copy('مجتمع المدرسة', 'School community');
  const roleName = (role: string) => ({
    TEACHER: copy('معلم', 'Teacher'), STUDENT: copy('طالب', 'Student'), PARENT: copy('ولي أمر', 'Parent'),
    ADMIN: copy('إدارة المدرسة', 'School administration'), PRINCIPAL: copy('مدير المدرسة', 'Principal'),
  }[role] || copy('عضو', 'Member'));
  const formatDate = (value: string) => new Date(value).toLocaleString(isEnglish ? 'en-US' : 'ar-EG');

  return (
    <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header><h1 className="text-2xl font-bold">{heading}</h1><p className="mt-1 text-sm text-muted-foreground">{copy('منشورات ونقاشات محفوظة ضمن نطاق المدرسة أو الفصل المرتبط.', 'Posts and discussions shared with your school or linked class.')}</p></header>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {audience === 'parent' && children.length > 1 && <label className="block max-w-sm space-y-1 text-sm"><span className="font-medium">{copy('ملف الطالب', 'Student profile')}</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3">{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
      {audience === 'teacher' && <form onSubmit={createPost} className="space-y-3 rounded-md border bg-card p-4"><h2 className="font-semibold">{copy('منشور جديد', 'New post')}</h2><label className="block space-y-1 text-sm"><span>{copy('النطاق', 'Audience')}</span><select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">{copy('كل المدرسة', 'Entire school')}</option>{classes.map((item) => <option key={item.id} value={item.id}>{copy('الفصل:', 'Class:')} {item.name}</option>)}</select></label><input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={copy('عنوان المنشور', 'Post title')} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /><textarea required maxLength={5000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder={copy('اكتب إعلانًا أو مشاركة تعليمية...', 'Write an announcement or educational post...')} className="w-full rounded-md border bg-background p-3 text-sm" /><button className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white"><Send className="h-4 w-4" />{copy('نشر', 'Publish')}</button></form>}
      {audience === 'parent' && !children.length && !loading && <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{copy('اربط طالبًا بحساب ولي الأمر لعرض مجتمع فصوله.', 'Link a student to the parent account to view their class community.')}</p>}
      {loading ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">{copy('جاري تحميل المنشورات...', 'Loading posts...')}</p> : posts.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{copy('لا توجد منشورات منشورة ضمن هذا النطاق.', 'There are no posts in this space yet.')}</p> : <div className="space-y-4">{posts.map((post) => <article key={post.id} className="space-y-4 rounded-md border bg-card p-4 md:p-5">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{post.title}</h2><p className="mt-1 text-xs text-muted-foreground">{post.author.name || roleName(post.author.role)} · {roleName(post.author.role)}{post.class?.name ? ` · ${post.class.name}` : ` · ${copy('المدرسة', 'School')}`} · {formatDate(post.createdAt)}</p></div>{audience === 'teacher' && <button onClick={() => void deletePost(post)} aria-label={copy('حذف المنشور', 'Delete post')} className="grid size-9 shrink-0 place-items-center rounded-md border text-red-700"><Trash2 className="h-4 w-4" /></button>}</div>
        <p className="whitespace-pre-wrap text-sm leading-7">{post.body}</p>
        <section className="space-y-3 border-t pt-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" />{copy('التعليقات', 'Comments')} ({post.comments.length})</h3>{post.comments.map((comment) => <div key={comment.id} className="rounded-md bg-muted/40 p-3"><p className="text-xs font-medium">{comment.author.name || roleName(comment.author.role)} · {roleName(comment.author.role)} <time className="font-normal text-muted-foreground">{formatDate(comment.createdAt)}</time></p><p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p></div>)}<div className="flex gap-2"><input value={comments[post.id] || ''} onChange={(event) => setComments((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={2000} placeholder={copy('أضف تعليقًا...', 'Add a comment...')} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" /><button onClick={() => void sendComment(post.id)} aria-label={copy('إرسال التعليق', 'Send comment')} className="grid size-10 shrink-0 place-items-center rounded-md bg-teal-700 text-white"><Send className="h-4 w-4" /></button></div></section>
      </article>)}</div>}
    </main>
  );
}
