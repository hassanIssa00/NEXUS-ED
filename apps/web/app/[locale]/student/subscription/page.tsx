import { CreditCard } from 'lucide-react';

export default function SubscriptionPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">الاشتراكات</h1>
        <p className="text-sm text-slate-600">خطط ورسوم الطالب المعتمدة من المدرسة.</p>
      </header>

      <section
        role="status"
        className="flex min-h-64 flex-col items-center justify-center gap-3 border-y border-slate-200 px-6 py-12 text-center"
      >
        <CreditCard className="h-8 w-8 text-slate-500" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">لا توجد خطط اشتراك متاحة</h2>
        <p className="max-w-lg text-sm leading-6 text-slate-600">
          لا يوجد كتالوج خطط أو مسار دفع مفعّل لهذا الحساب حاليًا. للاستفسار عن الرسوم المعتمدة، تواصل مع إدارة المدرسة.
        </p>
      </section>
    </main>
  );
}
