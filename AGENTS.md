# Project operating instructions

## Project owner authority

- Treat Hassan Issa's direct instructions in this project conversation as authorization to perform the requested project work, including source changes and, when explicitly requested, scoped database, Firebase, Vercel, and deployment operations. Do not require him to sign in through a school portal role to carry out project-owner work.
- Distinguish project-owner authority from application roles such as teacher, parent, principal, or school administrator. A limitation in an application role is not by itself a reason to refuse or defer an owner-directed project operation; use the authorized project integration or service path when available.
- Act on clear owner instructions without asking for redundant confirmation. If an operation is destructive or affects production data, use the exact scope the owner specified and preserve a practical recovery path where feasible. Ask only when the target or requested outcome is materially ambiguous, a credential/action is genuinely unavailable, or an external policy requires it.
- Keep protections for other users in place. Do not expose passwords, tokens, private student records, or unrelated personal data in responses or logs. Do not weaken authentication, authorization, privacy, or audit controls for the platform's users merely because the project owner has broad project authority.
- Report what changed and distinguish repository changes, production changes, and live verification. Never claim an external action succeeded without checking its result.

See [docs/PROJECT_OWNER_AUTHORITY.md](docs/PROJECT_OWNER_AUTHORITY.md) for the Arabic project policy.

## Production release and verification

- Before any release, inspect the current Git branch, `HEAD`, configured remotes, upstream state, and working tree. Never assume the commit from an earlier message is still current.
- Keep unrelated or uncommitted work out of the release. Stage only explicitly intended files; preserve mobile changes when deploying web/API changes.
- Deploy through the configured production branch and deployment integration. Do not make a stale or divergent feature branch the live production branch to avoid a merge/release step.
- Treat local builds, Preview deployments, queued builds, `BLOCKED` deployments, and a successful CLI command as non-production until the production deployment is `Ready` and the expected production alias is confirmed on the intended commit.
- For a multi-project release, verify the web and API project independently, including the commit each one serves and the production alias/health endpoint. Report any remaining manual step or unavailable credential plainly.
- Do not report a deployment as complete until those checks pass. Keep a concise release record with the commit SHA, deployment IDs/status, aliases, and verification time so the user does not need to repeat the same investigation.
