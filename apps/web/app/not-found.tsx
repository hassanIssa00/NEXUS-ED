'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NotFound() {
  const [isEnglish, setIsEnglish] = useState(false);

  useEffect(() => {
    setIsEnglish(window.location.pathname === '/en' || window.location.pathname.startsWith('/en/'));
  }, []);

  return (
    <div lang={isEnglish ? 'en' : 'ar'} dir={isEnglish ? 'ltr' : 'rtl'} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Animation */}
        <div className="relative mb-8">
          <h1 className="text-[150px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 leading-none">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl bg-blue-500/20 -z-10" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-4">
          {isEnglish ? 'Page not found' : 'الصفحة غير موجودة'}
        </h2>

        {/* Description */}
        <p className="text-slate-400 mb-8 text-lg">
          {isEnglish
            ? 'Sorry, the page you are looking for does not exist or has been moved.'
            : 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى مكان آخر.'}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={isEnglish ? '/en' : '/'}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all hover:scale-105 inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {isEnglish ? 'Go to home page' : 'العودة للرئيسية'}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {isEnglish ? 'Go back' : 'رجوع للخلف'}
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-12 text-sm text-slate-500">
          {isEnglish ? 'Need help?' : 'هل تحتاج مساعدة؟'}{' '}
          <a href="mailto:support@million-platform.com" className="text-blue-400 hover:underline">
            {isEnglish ? 'Contact technical support' : 'تواصل مع الدعم الفني'}
          </a>
        </p>
      </div>
    </div>
  );
}
