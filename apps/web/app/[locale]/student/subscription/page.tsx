import { useLocale } from 'next-intl';
import { CreditCard } from 'lucide-react';

export default function SubscriptionPage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">{t('الاشتراكات', 'Subscriptions')}</h1>
        <p className="text-sm text-slate-600">{t('خطط ورسوم الطالب المعتمدة من المدرسة.', 'Student plans and fees approved by the school.')}</p>
      </header>

      <section
        role="status"
        className="flex min-h-64 flex-col items-center justify-center gap-3 border-y border-slate-200 px-6 py-12 text-center"
      >
        <CreditCard className="h-8 w-8 text-slate-500" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">{t('لا توجد خطط اشتراك متاحة', 'No subscription plans are available')}</h2>
        <p className="max-w-lg text-sm leading-6 text-slate-600">
          {t('لا يوجد كتالوج خطط أو مسار دفع مفعّل لهذا الحساب حاليًا. للاستفسار عن الرسوم المعتمدة، تواصل مع إدارة المدرسة.', 'There is no plan catalog or payment option enabled for this account right now. Contact the school administration for information about approved fees.')}
        </p>
      </section>
    </main>
  );
}
