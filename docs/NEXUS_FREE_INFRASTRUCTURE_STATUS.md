# Nexus free infrastructure status

Verified: 2026-10-03

## Firebase project

- Project: `Nexus EDU - Al-Ikhlas School`
- Project ID: `nexus-edu-ikhlas-jeddah-2026`
- Plan: Firebase Spark, no-cost. Google Analytics and Firebase Gemini were left disabled.
- Web app: `Nexus EDU Web` is registered.
- Cloud Firestore: Standard edition, default database, `me-central2` (Dammam).
- Initial access mode: production mode. No school records or test accounts were created.
- Firestore rules were deployed on 2026-10-03 to this project only. They allow limited self-profile onboarding, one-time parent/student links, and parent surveys; every other collection remains denied. Unverified new accounts can create only their own `pending` student/parent profile, matching the registration sequence; role-gated access still requires verified email.
- Scheduled Firestore backups are not enabled; the console requires the paid Blaze plan for that feature.
- No test students, staff, grades, or other sample school records were created.

The deployed app is not yet connected to this database. The active school API uses
NestJS and Prisma with PostgreSQL (`apps/api/prisma/schema.prisma`). The Firebase
CLI is authenticated as the school account; project identity was verified before
the scoped-rules deployment. This did not create documents or accounts. Firebase
Storage is not part of the active school workflow;
its rules continue to deny every read and write until per-school and per-record
access is implemented and tested.
Firebase Authentication now has email/password and Google sign-in enabled, and
`nexus.masarplatform.org` is an authorized domain. The six public Firebase Web
App settings are configured in Vercel Production and Preview. These settings
only identify the client app; they do not deploy the local sign-in changes or
connect the NestJS API/database.

## Production blocker

There is no verified production PostgreSQL URL or deployed Nexus API service in
the current environment. The Prisma schema validates, but migrations have not
been applied to a live database and school workflows have not been smoke-tested
against one. Both previously documented Railway API health URLs returned HTTP 404 on
2026-10-03. The public login route returns HTTP 200, while `/api/health` on the
web domain returns 404; a rendered login page is not evidence that authentication
or database operations work. Firebase Auth providers and public client
configuration are enabled, and the Next.js changes have deployed. Vercel has no
production API URL, and the active NestJS/Prisma API still has no verified
production PostgreSQL connection. Student/parent Firebase signup can create only
pending identities; it is not a school enrollment or a connected academic record.

The latest Vercel deployment inspection also shows the Next.js route functions
running in `iad1` (US East). Firestore's Saudi region does not change where those
server-side requests execute. The school must approve the processing location
and any cross-border transfer safeguards before real student data is used; this
is a privacy/compliance gate, not a claim that the current setup is unlawful.

## Verification on 2026-10-03

- API unit suite: 16 suites and 104 tests pass locally, including auth/Google
  identity, password reset, WebSocket class-room, and QR-attendance checks.
- API production build: passes locally, including Prisma client generation.
- Prisma schema validation: passes with local placeholder connection URLs;
  this validates the schema only and does not connect to a production database.
- Dependency audit: a non-breaking API dependency refresh removed two findings;
  the API production dependency tree still reports 7 advisories (3 high, 4
  moderate), and the full monorepo audit reports 45 (30 high, 15 moderate).
  The web production tree separately reports 5 high findings, including the
  current Tailwind 3 dependency chain.
  Remaining API findings involve Prisma/deepmerge-ts and ExcelJS/uuid upgrade
  paths that npm only resolves by a breaking downgrade; they were not force-fixed.
  The Swagger 11 line pins the remaining js-yaml version. These issues still need
  dependency-by-dependency review before claiming production security.
- Web TypeScript: direct `tsc --noEmit` passes. Targeted ESLint for the changed
  auth screens reports no errors and four existing `<img>` optimization
  warnings. Starting the Next.js dev server and the web `check-types`/build
  remain blocked on this Windows machine by the `@swc/core` native binding/cache
  error, so no successful local web server or production build is claimed.
- Latest GitHub CI for `49805d5` (2026-10-03): dependency install, Prisma
  generation, Type Check, and Firestore emulator security tests pass. Lint fails
  on the existing backlog (7,164 problems: 5,254 errors and 1,910 warnings), so
  that run skipped API tests and builds. The workflow now runs tests/builds before
  lint; the next CI run will verify that ordering. The Firebase safeguards
  workflow passes but only validates deployment safeguards.
- Firestore rules: emulator security checks pass; Firebase CLI dry-run compiled
  the rules, and the scoped rules were then released to the Nexus project.
- Web: direct `tsc --noEmit` passes. The scripted Next check/build remains blocked
  on this Windows machine because the SWC native binding/cache fails to load.
- API: changed gateway and QR-attendance files pass targeted ESLint with no
  findings. Full GitHub CI still has the documented API-wide lint backlog.
- Additional API hardening: public registration now rejects staff roles inside
  the service as well as at DTO validation. QR sessions require an active teacher
  assigned to the requested class in the same school; only students can scan,
  requests are validated and rate-limited, and session duration is bounded.
- Flutter: widget and API endpoint-guard tests pass (3 total), targeted Dart
  analysis of changed files is clean, and a debug APK builds. Full-project
  `flutter analyze` reports 71 info-level lint items. A release app bundle reaches
  signing and then fails because the project has no Android release keystore or
  `key.properties`; no signing credential was generated. Android release now
  requires a secure public HTTPS API URL and cannot silently use the emulator
  endpoint. The live web domain currently has no `/api/health` route.
- The separate Expo workspace (`apps/mobile`) now uses the actual `/api/auth/mobile/*`
  token contract, rotates refresh tokens, validates `/api/users/me`, reads role
  dashboards, and uses authorized REST messaging instead of the old public-room
  socket mock. It passes TypeScript and Android JavaScript bundle export. It still
  has no production API URL, signed APK/AAB, final Android application ID, or
  Play-release verification; its dependency audit reports 35 advisories (23 high,
  12 moderate). It is not ready for Google Play.
- Latest observed Vercel production deployment: Ready at commit `49805d5`, with
  alias `https://nexus.masarplatform.org`. The live student Google login CTA is
  present, and all ten role login routes plus registration, recovery, and
  verification routes return HTTP 200. This is route/build smoke testing only:
  no real account, reset email, enrollment, or database workflow was exercised.
  `/api/health` still returns HTTP 404. Six public Firebase client variables are
  configured in Vercel Production and Preview. Firestore rules and Firebase Auth
  providers were deployed separately.
- The Vercel deployment inspection identifies the production alias as `git-master`
  and its Next.js route functions as `iad1`. The linked repo is
  `hassanIssa00/NEXUS-ED`; its production branch is `master`, while GitHub's
  default branch is `backup-ai-features` and no `main` branch exists. The
  additional `github-hassan` remote points to a repository that GitHub reports
  does not exist. A preview deployment built but is blocked by the project's SSO
  protection; SSO was not disabled. A direct Vercel production deploy was also
  blocked by deployment collaboration settings and was not promoted to the
  domain. `.vercelignore` now excludes mobile build/cache artifacts from uploads.
- Reverification on 2026-10-03: API tests (16 suites/104 tests) and API build pass;
  mobile TypeScript and Android bundle export pass; direct web TypeScript passes;
  Firestore rules emulator security checks pass; `git diff --check` is clean.
  Android bundle export is not a signed Play Store artifact, and these local
  checks do not substitute for production API/database smoke tests.

The local Nexus web changes also replace the hard-coded role counts on the admin
permissions page with the existing school-scoped `/users/stats` API response,
and add email-verification and pending-account gates. Those UI changes do not
create or approve real school accounts without a live API and authorized roster.
No real or sample school accounts were created.

The user's no-paid-services requirement is preserved. Firebase Spark has
product-specific free quotas; when a quota is exceeded, Firebase shuts off that
product for the rest of the billing month. It is not a guarantee of unlimited
school production capacity. Cloud Functions deployments require Blaze and a
linked billing account, so the existing `firebase/functions` prototype cannot
be deployed under the Spark-only constraint. Its rules were replaced with
deny-all, its deploy command now fails closed, and GitHub Actions no longer
deploys Firebase resources. Firebase SQL Connect's PostgreSQL backing database
is not a permanent Spark-only production option. Firebase Storage is not
enabled because this project would need a billing upgrade for it.

Do not place real student or parent data in a database region outside Saudi
Arabia until the school completes the required transfer-risk assessment and
appropriate safeguards. The available free PostgreSQL integration regions
reviewed for this deployment do not include Saudi Arabia. No such integration
was provisioned.

## Next deployment gate

Choose one supported architecture before enabling real registration:

1. Keep Prisma/PostgreSQL and provide a school-approved PostgreSQL host and API
   runtime in an approved region, with the necessary service credentials and
   operational backups.
2. Migrate supported data to Firestore and provide a separately approved,
   compliant runtime for trusted server operations. Spark alone does not deploy
   Cloud Functions, so grading, account administration, and other privileged
   operations cannot be called production-ready until that runtime is verified.

Neither path is complete yet. Treat Firebase self-signups as pending identities,
not school enrollments. Do not create/approve school accounts or enter real
student records until a path is provisioned, connected, migrated, and tested
with an authorized school roster.

## Student and parent sign-in additions

The deployed Next.js changes add Google sign-in and account creation for students
and parents only. Firebase email/password and Google providers are enabled, the
production domain is authorized, and public Firebase client settings are present
in Vercel Production and Preview. The API validates Google ID tokens against the
configured OAuth client, persists provider identities, and refuses staff roles.
Password recovery adds a six-digit, one-time API code that expires after ten
minutes, is stored as an HMAC hash, allows at most five attempts, sends through
the existing SMTP service, and revokes active refresh sessions after a reset.
Requests are rate-limited and return a generic response to avoid account
enumeration. Firebase-only email accounts use Firebase's standard password-reset
email link instead of the API's numeric code.

Firebase-only password recovery uses Firebase's reset-email link rather than a
numeric code. The custom `/reset-password` page still contains the old Supabase
recovery flow; it is not the Firebase reset handler. The six-digit code path
requires the NestJS API. The API needs `GOOGLE_CLIENT_ID`, SMTP credentials,
`PUBLIC_SCHOOL_ID` or `PUBLIC_SCHOOL_SLUG` for new accounts, an approved
production database, and the new Prisma migration
`20261003160000_google_auth_password_reset`. No API environment values, school
database, or live account/email have been provisioned. The web auth UI is live,
but the API implementation and Prisma migration are only local/Git source; they
are not deployed to a production API/database. Sample variable names are in
`apps/web/.env.example` and `apps/api/.env.example`.

## References

- [Firebase pricing plans and Spark quotas](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Cloud Functions deployment requirements](https://firebase.google.com/docs/functions/get-started)
- [Cloud Firestore locations](https://firebase.google.com/docs/firestore/locations)
- [Saudi regulation on personal-data transfers outside the Kingdom](https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/RegulationonPersonalDataTransferOutsidetheKingdom)
- [Vercel terms of service](https://vercel.com/legal/terms)
