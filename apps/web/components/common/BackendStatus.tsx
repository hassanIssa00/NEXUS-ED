import { Database, ShieldAlert } from 'lucide-react';

export default function BackendStatus({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="mx-auto flex min-h-[45vh] max-w-3xl flex-col items-center justify-center gap-4 px-5 py-12 text-center" dir="rtl">
      <Database className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p>
      <p className="inline-flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400"><ShieldAlert className="h-4 w-4" />لا تُعرض بيانات محلية أو أمثلة باعتبارها سجلات حقيقية.</p>
    </main>
  );
}
