'use client';

import { Clock3, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function PendingAccountPage() {
  const { profile, signOut } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir="rtl">
      <section className="w-full max-w-lg space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><Clock3 className="h-6 w-6" /></span>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><ShieldCheck className="h-4 w-4" /> حالة الحساب</p>
          <h1 className="mt-2 text-xl font-black text-gray-900 dark:text-white">حسابك قيد مراجعة المدرسة</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">تم حفظ بيانات التسجيل{profile?.full_name ? ` يا ${profile.full_name}` : ''}. لن نعرض سجلات أو درجات قبل اعتماد الحساب وربطه ببيانات المدرسة الفعلية.</p>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">لا توجد مدة مراجعة أو اعتماد تلقائي. تواصل مع إدارة المدرسة لإكمال التحقق، ثم سجّل الدخول مجددًا.</p>
        </div>
        <button type="button" onClick={() => void signOut()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
          <LogOut className="h-4 w-4" /> تسجيل الخروج
        </button>
      </section>
    </main>
  );
}
