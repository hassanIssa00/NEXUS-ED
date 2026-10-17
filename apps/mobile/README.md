# Nexus EDU Mobile

Native Android/iOS client built with Expo, React Native, and Expo Router. The app uses the Nexus API and the existing Firebase Authentication/Firestore project; it does not ship an AI provider key or use sample school records.

## Configure

Copy `.env.example` to `.env` and set the public Firebase client values from the existing Nexus Firebase Web App configuration. These `EXPO_PUBLIC_*` values are bundled into the app and are not service-account secrets. Never add a Firebase Admin key, database password, AI key, or other server credential here. The API and Firebase server-side rules remain responsible for authorization.

The Firebase app must use the same project as the website so the existing `users/{uid}` profile and API token exchange work. The API URL defaults to the deployed Nexus API; Android emulator development can override it with `http://10.0.2.2:4000/api` when running the API locally.

## Run

From the repository root:

```sh
npm run typecheck --workspace=mobile
npm run start --workspace=mobile
```

Scan the Expo QR code with Expo Go, or press `a` while an Android emulator is available. After changing native plugins or permissions, restart Expo with a clean cache and use a development build if Expo Go does not contain the required native module.

## Current app flows

- Student/parent Firebase registration and sign-in, server session exchange, email verification after onboarding, and Firebase password-reset links.
- Student profile and photo upload, real placement assessment, parent student-code linking, and parent survey.
- Role-specific dashboards and API-backed teacher assignment, attendance, grading review, AI suggestion, and assistant screens.
- AI-generated questions are presented as unsaved suggestions; grades require teacher approval. Empty records stay empty rather than being replaced with demo data.

Mobile authentication uses email and password. Google sign-in is intentionally not offered in the app.

The Android package and iOS bundle identifier are currently `org.masarplatform.nexusedu`; confirm that identifier before the first store release because it becomes permanent after publishing.
