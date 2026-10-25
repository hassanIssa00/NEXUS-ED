import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import '../globals.css';
import { locales, type Locale } from '../../i18n';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AiTutorWidget } from '@/components/ai/ai-tutor-widget';

export const metadata: Metadata = {
    title: 'NEXUS EDU | نكسس التعليمية',
    description: 'School Management Platform',
    icons: {
        icon: '/logo_new.webp',
        apple: '/logo_new.webp',
    },
};

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    // A request-bound CSP nonce requires Next.js to render scripts dynamically.
    await headers();
    const { locale } = await params;
    if (!locales.includes(locale as Locale)) notFound();
    const activeLocale = locale as Locale;

    // Keep the server and client locale bound to the URL segment. Without
    // this, a request can render /en/... with the default Arabic client locale.
    setRequestLocale(activeLocale);
    const messages = await getMessages();

    return (
        <html lang={activeLocale} dir={activeLocale === 'ar' ? 'rtl' : 'ltr'}>
            <body>
                <AuthProvider>
                    <NextIntlClientProvider locale={activeLocale} messages={messages}>
                        <AuthGuard>
                            {children}
                        </AuthGuard>
                        <Toaster />
                        <AiTutorWidget />
                    </NextIntlClientProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
