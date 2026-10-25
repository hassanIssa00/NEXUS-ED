'use client';

import { useEffect, useState } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorBoundaryProps) {
  const [isEnglish, setIsEnglish] = useState(false);

  useEffect(() => {
    // Log error to monitoring service
    console.error('Application Error:', error);
  }, [error]);

  useEffect(() => {
    const english = window.location.pathname === '/en' || window.location.pathname.startsWith('/en/');
    setIsEnglish(english);
    document.documentElement.lang = english ? 'en' : 'ar';
    document.documentElement.dir = english ? 'ltr' : 'rtl';
  }, []);

  const copy = isEnglish
    ? {
        title: 'An unexpected error occurred',
        description: 'We are sorry about this error. Please try again or contact technical support.',
        retry: 'Try again',
        home: 'Home page',
        help: 'Need help?',
        contact: 'Contact us',
      }
    : {
        title: 'حدث خطأ غير متوقع',
        description: 'نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.',
        retry: 'حاول مرة أخرى',
        home: 'الصفحة الرئيسية',
        help: 'هل تحتاج مساعدة؟',
        contact: 'تواصل معنا',
      };

  return (
    <html lang={isEnglish ? 'en' : 'ar'} dir={isEnglish ? 'ltr' : 'rtl'}>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl p-8 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2">
              {copy.title}
            </h1>

            {/* Description */}
            <p className="text-slate-400 mb-6">
              {copy.description}
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-slate-900 rounded-lg text-left overflow-auto max-h-32">
                <code className="text-xs text-red-400">
                  {error.message}
                </code>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {copy.retry}
              </button>
              <button
                onClick={() => window.location.href = isEnglish ? '/en' : '/'}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                {copy.home}
              </button>
            </div>

            {/* Contact Support */}
            <p className="mt-6 text-sm text-slate-500">
              {copy.help}{' '}
              <a href="mailto:support@million-platform.com" className="text-blue-400 hover:underline">
                {copy.contact}
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
