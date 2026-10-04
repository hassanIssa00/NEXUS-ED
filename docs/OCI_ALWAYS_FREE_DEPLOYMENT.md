# OCI Always Free deployment

This deploys the web app, NestJS API, PostgreSQL, and Caddy from the repository's
production Compose file to one Oracle Cloud VM. It does not use Railway or a
time-limited trial resource. Only create resources explicitly labeled
**Always Free Eligible** in the account's home region; never enable Pay As You Go.

## Important limitations

OCI Always Free compute has no production SLA and capacity may be unavailable.
Oracle may reclaim an Always Free VM after seven days below its published CPU,
network, and (for A1) memory utilization thresholds. A single VM also has no
high availability. Keep independent, encrypted database backups and rehearse
restoring them before storing real student records. A paid-grade school rollout
requires the school to accept these availability and recovery risks.

Vercel currently serves the web frontend only; the live `/api/health/live` route
returns 404 there. Do not point the school domain to this VM until the API is
ready and the school has verified the backup and recovery procedure. If the
current Vercel project is on Hobby, its terms limit it to personal or
non-commercial use; the project's plan has not been verified here.

## One-time VM setup

1. Create an OCI account and an A1 VM in the tenancy home region, selecting only
   an **Always Free Eligible** shape with no paid add-ons. Capacity is not
   guaranteed. A public IPv4 address, inbound TCP 22/80/443, Git, Docker Engine,
   and the Docker Compose plugin are required.
2. As the deployment user, clone the public `master` branch to the expected
   deployment path: `git clone --depth=1 --branch master
   https://github.com/hassanIssa00/NEXUS-ED.git "$HOME/nexus-edu-prod"`.
3. Create `$HOME/nexus-edu-prod/.env.production` on the VM using
   `.env.production.example` as a template. Use unique secrets, real school
   OAuth and SMTP credentials, and an administrator mailbox controlled by the
   school. Restrict the file to the deployment user (`chmod 600`). Do not put
   student or staff data in the seed; it creates only the school record.
4. Set the domain's DNS A record to the VM's public IP. Caddy needs the domain
   to resolve to the VM and ports 80/443 reachable to issue HTTPS certificates.
5. In GitHub repository Actions variables, set `OCI_DEPLOY_ENABLED=true`. In the
   `production` environment, add these secrets:
   - `OCI_HOST`: VM public IPv4 address or SSH hostname.
   - `OCI_USER`: deployment user's SSH login.
   - `OCI_SSH_PRIVATE_KEY`: private key corresponding to the VM's authorized key.
   - `OCI_SSH_KNOWN_HOSTS`: pinned `known_hosts` line for that VM.
   - `OCI_SSH_PORT`: optional; defaults to `22`.

After setup, pushes to `master` deploy only after the complete CI job succeeds.
The workflow refuses unknown SSH host keys, uses fast-forward-only source
updates, and verifies the API readiness endpoint against PostgreSQL. It never
prints production environment values. If `OCI_DEPLOY_ENABLED` is not `true`, no
deployment job runs.

## Final verification

After the first deployment, verify `https://<school-domain>/api/health/live` and
`https://<school-domain>/api/health/ready` return healthy responses, then test
sign-in, password reset email delivery, uploads, reports, and database restore
with school-approved test accounts. Health success alone does not prove that
all user workflows, legal requirements, or disaster recovery are ready.
