import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const selfHostedBuild = process.env.NEXUS_SELF_HOSTED_BUILD === '1';
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(selfHostedBuild
    ? {
        output: 'standalone',
        outputFileTracingRoot: path.resolve(projectRoot, '../..'),
      }
    : {}),
  poweredByHeader: false,
  turbopack: {
    root: path.resolve(projectRoot, '../..'),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/(.*).webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const apiOrigin = process.env.NEXUS_API_ORIGIN?.trim().replace(/\/+$/, '');
    if (!apiOrigin) return [];

    let parsedOrigin;
    try {
      parsedOrigin = new URL(apiOrigin);
    } catch {
      throw new Error('NEXUS_API_ORIGIN must be an absolute HTTPS URL');
    }
    if (parsedOrigin.protocol !== 'https:') {
      throw new Error('NEXUS_API_ORIGIN must use HTTPS');
    }

    return [{
      source: '/api/:path*',
      destination: `${apiOrigin}/api/:path*`,
    }];
  },
  // Note: 'eslint' is not a valid key in Next.js 15+.
  // ESLint during builds is skipped via the DISABLE_ESLINT_PLUGIN env var,
  // or by configuring .eslintrc directly.
};

export default withNextIntl(nextConfig);
