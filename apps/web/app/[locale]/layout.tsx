import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from 'next';
import '../globals.css';
import { locales, type Locale, defaultLocale } from '../../i18n';
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
    const { locale } = await params;

    // Get messages - next-intl will handle validation
    const messages = await getMessages();

    return (
        <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <body>
                <AuthProvider>
                    <NextIntlClientProvider messages={messages}>
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
