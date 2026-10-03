// Next.js 16: proxy.ts replaces the deprecated middleware.ts
// The "middleware" file convention is deprecated in Next.js 16 - use "proxy" instead
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlProxy = createMiddleware(routing);

function addOrigin(value: string | undefined, origins: Set<string>) {
    if (!value) return;

    try {
        const url = new URL(value);
        if (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) {
            origins.add(url.origin);
        } else if (url.protocol === 'wss:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'ws:')) {
            origins.add(`${url.protocol}//${url.host}`);
        }
    } catch {
        // Ignore malformed optional endpoints; they must not widen the policy.
    }
}

export default function proxy(request: NextRequest) {
    const nonce = btoa(crypto.randomUUID());
    const connectSources = new Set([
        "'self'",
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'https://firestore.googleapis.com',
        'https://firebaseinstallations.googleapis.com',
        'https://firebasestorage.googleapis.com',
        'https://*.firebasestorage.app',
        'https://*.firebaseio.com',
        'wss://*.firebaseio.com',
        'https://www.googleapis.com',
        'https://oauth2.googleapis.com',
        'https://api.stripe.com',
        'https://m.stripe.network',
        'https://r.stripe.com',
        'https://q.stripe.com',
    ]);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

    addOrigin(apiUrl, connectSources);
    addOrigin(socketUrl, connectSources);

    for (const endpoint of [apiUrl, socketUrl]) {
        if (!endpoint) continue;

        try {
            const url = new URL(endpoint);
            if (url.protocol === 'https:') {
                connectSources.add(`wss://${url.host}`);
            } else if (url.protocol === 'http:' && process.env.NODE_ENV !== 'production') {
                connectSources.add(`ws://${url.host}`);
            }
        } catch {
            // addOrigin handles the invalid URL without trusting it.
        }
    }

    let authFrame = '';
    try {
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
        const hostname = authDomain ? new URL(`https://${authDomain}`).hostname : '';
        if (hostname.endsWith('.firebaseapp.com') || hostname.endsWith('.web.app')) {
            authFrame = `https://${hostname}`;
        }
    } catch {
        // An invalid auth domain must not be interpolated into the policy.
    }
    const scriptSources = [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        'https://apis.google.com',
        'https://accounts.google.com',
        'https://www.gstatic.com',
        'https://js.stripe.com',
    ];

    if (process.env.NODE_ENV !== 'production') scriptSources.push("'unsafe-eval'");

    const policy = [
        "default-src 'self'",
        `script-src ${scriptSources.join(' ')}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://images.unsplash.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://firebasestorage.googleapis.com https://*.firebasestorage.app",
        "font-src 'self' data: https://fonts.gstatic.com",
        `connect-src ${[...connectSources].join(' ')}`,
        `frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.web.app https://js.stripe.com https://hooks.stripe.com https://meet.jit.si ${authFrame}`,
        "media-src 'self' blob: data: https://firebasestorage.googleapis.com",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://accounts.google.com",
        "frame-ancestors 'self'",
        ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; ');

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', policy);

    const requestWithNonce = new NextRequest(request, {
        headers: requestHeaders,
        ...(request.method !== 'GET' && request.method !== 'HEAD'
            ? { body: request.body, duplex: 'half' as const }
            : {}),
    });
    const response = intlProxy(requestWithNonce);
    response.headers.set('Content-Security-Policy', policy);

    return response;
}

export const config = {
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'
    ]
};
