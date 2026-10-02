'use client';

import Link from 'next/link';
import { ClipboardCheck, FileBarChart2, FileText, MessageSquareText } from 'lucide-react';

const tools = [
  { href: '/teacher/attendance', label: 'تحضير الطلاب', detail: 'تسجيل الحضور والغياب في قاعدة بيانات المدرسة.', icon: ClipboardCheck },
  { href: '/teacher/assignments', label: 'الواجبات', detail: 'إنشاء الواجبات ومتابعة تسليمات الطلاب.', icon: FileText },
  { href: '/teacher/grading', label: 'تصحيح التسليمات', detail: 'مراجعة الإجابات ورصد الدرجات والملاحظات.', icon: FileBarChart2 },
  { href: '/teacher/reports', label: 'التقارير', detail: 'عرض التقارير المتاحة حسب بيانات المدرسة.', icon: FileBarChart2 },
  { href: '/teacher/messages', label: 'الرسائل', detail: 'متابعة المحادثات المسجلة في النظام.', icon: MessageSquareText },
];

export default function NexusToolsTab() {
  return (
    <section className="space-y-4" dir="rtl" aria-labelledby="teacher-tools-title">
      <header>
        <h2 id="teacher-tools-title" className="text-lg font-bold text-foreground">أدوات المعلم المتصلة بالنظام</h2>
        <p className="mt-1 text-sm text-muted-foreground">كل أداة تفتح سير العمل المرتبط ببيانات المدرسة، دون بيانات محلية تجريبية.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map(({ href, label, detail, icon: Icon }) => (
          <Link key={href} href={href} className="group flex min-h-28 items-start gap-3 rounded-md border bg-card p-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
            <span><span className="block font-semibold text-foreground">{label}</span><span className="mt-1 block text-sm text-muted-foreground">{detail}</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
