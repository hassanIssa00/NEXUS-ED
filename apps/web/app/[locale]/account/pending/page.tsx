'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from '@/i18n/routing';

export default function PendingAccountPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }

    const destination = profile.role === 'student' || profile.role === 'parent'
      ? '/student/new'
      : profile.role === 'manager'
        ? '/admin'
      : `/${profile.role}`;
    router.replace(destination);
  }, [loading, profile, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-sm text-gray-500 dark:bg-[#0f1015]" dir="rtl" aria-busy="true">
      جارٍ فتح حسابك...
    </main>
  );
}
