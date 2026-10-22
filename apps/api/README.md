# Nexus EDU API

The school API is a NestJS service backed by PostgreSQL through Prisma. It does
not create demo classes, students, parents, teachers, or grades.

## Fresh setup

Requirements: Node.js 22, npm 11, and a reachable PostgreSQL database.

1. From the repository root, run `npm ci`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and set the database URLs,
   two JWT secrets, the public frontend origin, and Firebase project ID. Keep
   the pooled database URL in `DATABASE_URL` and the direct PostgreSQL URL in
   `DIRECT_URL` for migrations. Gmail API OAuth2 or SMTP can enable API-sent email.
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
production deployment needs valid database, JWT, and HTTPS frontend-origin
values. Store connection strings and JWT secrets only in the hosting provider's
encrypted variables, never in Git.

### Gmail API email setup

If Google App Passwords are unavailable, configure Gmail API OAuth2 instead:

1. In the Google Cloud project used for the sender, enable the Gmail API and
   create an OAuth client ID and client secret.
2. Configure OAuth consent for the sender account and authorize only
   `https://www.googleapis.com/auth/gmail.send`.
3. Obtain an offline refresh token for `nexuseduplatform@gmail.com` using that
   OAuth client. Keep the client secret and refresh token private.
4. In the API deployment environment, keep `SMTP_USER` and `SMTP_FROM_EMAIL` set
   to `nexuseduplatform@gmail.com`; set `GMAIL_OAUTH_CLIENT_ID`,
   `GMAIL_OAUTH_CLIENT_SECRET`, and `GMAIL_OAUTH_REFRESH_TOKEN`. When all three
   are present, Gmail API OAuth2 is used instead of SMTP. Do not put these values
   in frontend variables, source code, screenshots, or chat.

Google OAuth consent apps left in **Testing** can have refresh tokens expire
after seven days for Gmail scopes. Complete the consent-screen publishing and
verification steps Google requires for the chosen audience before relying on
this for long-term production email.

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
