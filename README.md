# Nexus EDU

Nexus EDU is the school platform monorepo. It contains the web application,
the NestJS API, and the Expo mobile application. Production data belongs to the
configured school database; seeding never generates sample students, parents,
teachers, classes, or grades. CI auth smoke tests use temporary accounts only
in its disposable PostgreSQL database.

## Workspace layout

- `apps/web`: Next.js web platform.
- `apps/api`: NestJS API, Prisma schema, migrations, and database bootstrap.
- `apps/mobile`: Expo / React Native application.

## Requirements

- Node.js 22 or newer and npm 11.
- PostgreSQL 15 or newer for the API.

Install from the repository root:

```sh
npm ci
```

Each app has its own `.env.example`. Copy only the relevant example to a local
`.env` file and supply credentials through your secret manager in hosted
environments. Never commit real secrets.

## API and database

See [`apps/api/README.md`](apps/api/README.md) for first setup, required
environment variables, migrations, health checks, and one-time administrator
provisioning. The seed creates only the Al-Ikhlas school record; it creates no
test accounts or fabricated school data.

## Development and checks

```sh
npm run dev --workspace=web
npm run start:dev --workspace=api
npm run start --workspace=mobile
npm run lint --workspace=web
npm run lint --workspace=api
npm run check-types
npm run typecheck --workspace=mobile
```

The GitHub Actions workflow runs migrations against disposable PostgreSQL,
checks the idempotent school-only seed, exercises API health/authentication,
builds the apps and containers, tests Firestore rules, and runs lint/type checks.

## Deployment status

The web app has its own Vercel deployment. No API host is configured in this
repository, and the school API is not considered deployed or production-ready
until its public readiness endpoint is verified against the production database
and mail service. Do not use trial hosting or a free tier whose published terms
exclude production workloads. Mobile store distribution also requires a final
application identifier, production API URL, and signed Android release.
