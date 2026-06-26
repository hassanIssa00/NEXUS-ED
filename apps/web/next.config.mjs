import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
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
  // Note: 'eslint' is not a valid key in Next.js 15+.
  // ESLint during builds is skipped via the DISABLE_ESLINT_PLUGIN env var,
  // or by configuring .eslintrc directly.
};

export default withNextIntl(nextConfig);
