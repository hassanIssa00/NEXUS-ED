'use client';

import { useEffect, useState } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [isEnglish, setIsEnglish] = useState(false);

  useEffect(() => {
    console.error('Page Error:', error);
  }, [error]);

  useEffect(() => {
    setIsEnglish(window.location.pathname === '/en' || window.location.pathname.startsWith('/en/'));
  }, []);

  const copy = isEnglish
    ? {
        title: 'Something went wrong while loading this page',
        description: 'You can try again.',
        retry: 'Try again',
      }
    : {
        title: 'حدث خطأ في تحميل الصفحة',
        description: 'لا تقلق، يمكنك المحاولة مرة أخرى',
        retry: 'إعادة المحاولة',
      };

  return (
    <div lang={isEnglish ? 'en' : 'ar'} dir={isEnglish ? 'ltr' : 'rtl'} className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-600 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {copy.title}
        </h2>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {copy.description}
        </p>

        {/* Retry Button */}
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {copy.retry}
        </button>
      </div>
    </div>
  );
}
