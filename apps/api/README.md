# Nexus EDU API

The school API is a NestJS service backed by PostgreSQL through Prisma. It does
not create demo classes, students, parents, teachers, or grades.

## Fresh setup

Requirements: Node.js 22, npm 11, and a reachable PostgreSQL database.

1. From the repository root, run `npm ci`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and set the database URLs,
   two JWT secrets, public frontend origin, Google OAuth web client ID, and SMTP
   credentials. Keep the pooled database URL in `DATABASE_URL` and the direct
   PostgreSQL URL in `DIRECT_URL` for migrations.
3. Generate separate JWT secrets with
   `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
   Do not reuse either value for another application or commit them.
4. Apply the committed schema migrations with
   `npm run db:migrate --workspace=api`.
5. Run `npm run db:seed --workspace=api`. This idempotently creates only the
   real Al-Ikhlas school record; it creates no synthetic people or class data.
6. Run `npm run build --workspace=api`, then
   `npm run start:dev --workspace=api`.

To create the first administrator, set `BOOTSTRAP_ADMIN_EMAIL` and
`BOOTSTRAP_ADMIN_PASSWORD` for one seed run (and optionally
`BOOTSTRAP_ADMIN_NAME`). The password must be 16-72 UTF-8 bytes. The seed never
prints it, will not overwrite an account, and refuses to create a bootstrap
administrator if an active administrator already exists. Remove these
bootstrap values from deployment configuration after provisioning.

## Runtime checks

- `GET /api/health/live` checks that the process can answer requests.
- `GET /api/health/ready` checks the PostgreSQL connection and application
  readiness plus SMTP connectivity when SMTP is configured; it returns a
  non-2xx response when required checks fail.
- `GET /api/health` provides the general readiness status.
- `GET /api/docs` is exposed outside production, or when
  `ENABLE_API_DOCS=true` is explicitly set.

The API exits unsuccessfully when production configuration is incomplete. A
production deployment needs valid database, JWT, Google OAuth, and SMTP values;
put secrets in the hosting provider's encrypted variables, never in Git.

## Verification

From the repository root:

```sh
npm run build --workspace=api
npm run db:seed --workspace=api
npm test --workspace=api -- --runInBand
npm run lint --workspace=api
```

CI additionally applies every Prisma migration to a disposable PostgreSQL
service, verifies the seed is repeatable and contains no demo users, starts the
production API against PostgreSQL, exercises authentication and readiness, and
builds both production Docker targets.
