# Nexus free infrastructure status

Verified: 2026-10-03

## Firebase project

- Project: `Nexus EDU - Al-Ikhlas School`
- Project ID: `nexus-edu-ikhlas-jeddah-2026`
- Plan: Firebase Spark, no-cost. Google Analytics and Firebase Gemini were left disabled.
- Web app: `Nexus EDU Web` is registered.
- Cloud Firestore: Standard edition, default database, `me-central2` (Dammam).
- Initial access mode: production mode. The database has no documents and its client rules deny all reads and writes.
- Scheduled Firestore backups are not enabled; the console requires the paid Blaze plan for that feature.
- No test students, staff, grades, or other sample school records were created.

The deployed app is not yet connected to this database. The active school API uses
NestJS and Prisma with PostgreSQL (`apps/api/prisma/schema.prisma`), while the
Firebase Firestore helper module is not used by the app's current auth or school
workflows. Do not loosen Firestore rules or add client access until the
authentication identity, school scope, roles, and record ownership are enforced
and tested. The checked-in `firestore.rules` therefore remains deny-all. Firebase
Storage is not part of the active school workflow either; `storage.rules` now
denies every read and write until per-school and per-record access is tested.

## Production blocker

There is no verified production PostgreSQL URL or deployed Nexus API service in
the current environment. The Prisma schema validates, but migrations have not
been applied to a live database and school workflows have not been smoke-tested
against one. A fresh Vercel production environment listing had no variables, and
both previously documented Railway API health URLs returned HTTP 404 on
2026-10-03. Firebase Auth sign-in providers are not enabled because the current
web auth flow expects the NestJS API or Supabase; enabling an unused provider
would not make login work.

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

Neither path is complete yet. Keep production registration disabled and do not
create school accounts until a path is provisioned, connected, migrated, and
tested with authorized real records.

## References

- [Firebase pricing plans and Spark quotas](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Cloud Functions deployment requirements](https://firebase.google.com/docs/functions/get-started)
- [Cloud Firestore locations](https://firebase.google.com/docs/firestore/locations)
- [Saudi regulation on personal-data transfers outside the Kingdom](https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/RegulationonPersonalDataTransferOutsidetheKingdom)
- [Vercel terms of service](https://vercel.com/legal/terms)
