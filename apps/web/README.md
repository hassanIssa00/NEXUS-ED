# Nexus Education Platform

Nexus is part of the Ismail Edu platforms workspace. Its current source contains a Next.js web client, a NestJS API backed by Prisma/PostgreSQL, and a Flutter mobile client.

## Applications

- `apps/web`: Next.js web application. The development script serves on port `3005`.
- `apps/api`: NestJS API. Configure the database and secrets from `apps/api/.env.example`; the API defaults to port `4000` and exposes its routes under `/api`.
- `apps/flutter_app`: Flutter mobile application.

## Local Setup

1. Install dependencies separately in the application you are working on.
2. For the API, create `apps/api/.env` from `.env.example` and provide real PostgreSQL and secret values. Do not commit `.env` files.
3. Set `NEXT_PUBLIC_API_URL` for the web application to the API base URL, for example `http://localhost:4000/api`.
4. Start the API and web application using the scripts in their respective `package.json` files. The web development server uses port `3005`.
5. Follow the Flutter toolchain setup for `apps/flutter_app` and configure its API base URL for the target device.

Database migrations and production configuration must be reviewed and applied deliberately for the target environment. This repository does not ship demo accounts or demo passwords; use the school's approved account-provisioning process.

## Configuration and Security

- `apps/api/.env.example` documents API configuration keys. Replace every sample secret and credential with deployment-managed values.
- The web client communicates with the API using `NEXT_PUBLIC_API_URL`.
- Do not place production credentials, student records, or service-account keys in this repository.
- Review the root `docs/platform-implementation-status.md` for current implementation scope and verification limits.
