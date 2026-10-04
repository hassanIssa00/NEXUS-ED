# Nexus EDU production deployment

## Current gate (verified 2026-10-04)

- Neon free PostgreSQL project `nexus` is provisioned in AWS US East. Six Prisma
  migrations are applied to `neondb`; the idempotent seed contains the real
  Al-Ikhlas school record only. The database has zero users and zero classes.
- No NestJS API service is deployed or connected to Vercel. The production
  website therefore cannot use this PostgreSQL database for school workflows;
  do not enter student or staff records yet.
- Railway is excluded. An OCI Always Free self-hosted stack is now prepared in
  `docker-compose.prod.yml`, but it is not deployed: this machine has no OCI CLI
  or authenticated OCI tenancy. OCI's free compute allocation is limited to its
  home region and may be reclaimed when idle, so it is not an availability
  guarantee for a school-critical production system.
- Vercel Hobby is not an acceptable free host for the official school service;
  Vercel's own terms restrict Hobby to personal or non-commercial use. Confirm
  the existing Vercel account is on an eligible commercial plan before serving
  the school through that deployment.
- The mobile app now passes Expo SDK checks and Android JavaScript bundling, but
  it has no production API URL, final Android application ID, or signed AAB.
- Neon is currently in AWS US East, not Saudi Arabia. Confirm school/data
  residency requirements before storing student or staff personal information.
- Current dependency audit still reports 7 API findings (3 high, 4 moderate)
  and 5 high findings in the web workspace audit. Lint exits successfully with
  zero errors, but the API has 1,651 existing warnings; this is not a clean
  security or lint bill of health.

The dated entries below are historical verification notes and may describe
older repository, deployment, or database states. The current gate above wins.

### OCI Always Free deployment preparation

`docker-compose.prod.yml` now defines PostgreSQL, one-shot Prisma migrations and
the real-school-only seed, the Nest API, a standalone Next.js image, and Caddy
automatic HTTPS. Start from `.env.production.example`; use only resources marked
Always Free and do not upgrade the tenancy or provision trial-only resources.
Oracle's current Always Free Ampere allocation is limited to 2 OCPUs and 12 GB
RAM in the tenancy's home region; capacity is not guaranteed, and Oracle may
reclaim an instance after seven days meeting its published idle thresholds.
Treat this as best-effort hosting, not a production SLA.

No Oracle tenancy, VM, DNS update, or secret was provisioned from this workspace.
Before real student data is allowed, the school must have a verified hosting
tenancy and approved Saudi data location, actual OAuth/SMTP credentials, tested
private file storage and backups, and a successful live auth/readiness smoke test.
The seed creates only the configured school; an initial administrator is created
only when a real mailbox and one-time password are deliberately provided.

- GitHub source: `hassanIssa00/NEXUS-ED`
- Production branch: `master`
- Vercel project: `nexus-edu-web`
- Vercel root directory: `apps/web`
- Production domain: `https://nexus.masarplatform.org`
- Build: `npm install --legacy-peer-deps`, then `npm run build` from `apps/web`

Deployments should be triggered by pushing to the configured production branch.
Do not deploy from the monorepo root with the Vercel CLI: local Android and
Turbo build artifacts can make that upload unnecessarily large. Configure a
separate backend deployment for changes under `apps/api`.

### Production readiness gates

- Vercel Production has the six public Firebase web configuration values, but no `NEXT_PUBLIC_API_URL`. Firebase client keys do not connect the site to the NestJS API or PostgreSQL; authenticated school workflows require a deployed HTTPS API.
- The existing Neon account contains a project named `nexus` in AWS US East, but it is not verified or connected as the production school database. Do not run migrations or add real Saudi student records until the school approves the region and the existing schema/data have been assessed.
- `apps/api/Dockerfile` provides a long-running API runtime target and a separate `migrator` target. Deploy the API to a host that supports persistent Node processes and WebSockets; apply migrations as a reviewed one-shot release step, then set `NEXT_PUBLIC_API_URL` in Vercel and `EXPO_PUBLIC_NEXUS_API_URL` / `NEXUS_API_URL` for mobile builds. GitHub CI tests migrations and readiness only against an ephemeral PostgreSQL database.
- Private assignment storage is not verified in Supabase. Complete the bucket and server-only key steps in `docs/NEXUS_PRIVATE_FILE_STORAGE.md` before enabling uploads.
- `apps/mobile` is an Expo starter, not a feature-complete Nexus mobile client or a Google Play release. It needs its own implementation and release validation.

### Verified status — 2026-10-03

- Commit `a8427f5` is on `master`; its Vercel production deployment is `Ready` and aliased to `https://nexus.masarplatform.org`.
- Live `/ar/login` returns HTTP 200 with a CSP nonce attached to rendered scripts; consecutive requests receive different nonces. `/api/health` still returns 404 because no API service is deployed on the web domain.
- GitHub CI run `37108570445` passed the six Prisma migrations on an empty PostgreSQL 16 service, API tests and readiness smoke test, runtime and migrator Docker builds, Next production build, and CSP smoke test. These are CI-only resources; no production database was migrated or populated.

### Verified status — 2026-10-02

- The production domain returned HTTP 200 for `/ar/login`; the latest verified production deployment is attached to `hassanIssa00/NEXUS-ED` branch `master` at commit `8bac588e8c7f62f50fb5f6c6a69659d4f5bb8a25`. The earlier mismatch was that Vercel watched a different GitHub repository; its source is now corrected.
- The live web response has HSTS, nosniff, frame, referrer, and permissions headers. A Content-Security-Policy header is not present yet; do not describe the site as fully hardened.
- Live sign-in intentionally remains unavailable until a real API or Supabase auth provider is configured. No production Vercel environment variables were present at verification time.
- API source tests and build pass locally. The API production service itself is not verified: the legacy Railway health URL returned 404, and no confirmed Nexus API deployment/environment is connected here.
- `npm audit --workspace=api --omit=dev` reports 3 high and 4 moderate findings, including Prisma/deepmerge-ts, `@nestjs/swagger`/js-yaml, and ExcelJS/uuid. Prisma CLI is build-only and has been moved to `devDependencies`; the audit still reports it through Prisma Client's optional peer relationship. No forced downgrade was applied.
- The frontend production dependency audit reports zero findings. This does not cover production configuration or the separate API service.
- Firebase CLI's configured default project is `million-edtech-platform`, not a verified Nexus project. Existing Firebase rules have not been deployed; confirm the Nexus project and review rules in the emulator before any Firebase deployment.
- Admin-only protection was added to detailed API health metrics. Public liveness/readiness probes remain available.
- Student analytics now return `null` for grade or attendance measures with no supporting records. The fabricated composite score and fixed week/month comparison increments were removed; the student pages show an unavailable/empty state instead of invented results or fallback zeros.
- The student grade page only calculates percentages when it has a valid score and denominator, and the attendance page distinguishes an API failure from an actual empty register. Gamification rank and student totals come from school-scoped database queries; the unused Firestore helper that wrote sample grades and assignments was removed.
- The follow-up API suite passes 81 tests, the API build passes, and web TypeScript checking passes. The latest Vercel production deployment for commit `8bac588e8c7f62f50fb5f6c6a69659d4f5bb8a25` is `Ready`; `https://nexus.masarplatform.org/ar/login` returned HTTP 200 after deployment.
- No school roster, student accounts, classes, grades, attendance, or sample records were created. The deployed site has Firebase public configuration but no API URL, and there is no verified production API/database against which to create or test real school accounts.

These checks are a point-in-time verification, not a guarantee of complete security. Do not enable student or parent accounts until the API/auth provider, production secrets, storage policy, and Firebase ownership are confirmed and smoke-tested against the actual school deployment.

### Firebase update — 2026-10-03

- The unused `prayer002` Firebase project was deleted at the user's request.
- Created Firebase project `nexus-edu-ikhlas-jeddah-2026` on the no-cost Spark plan and registered the `Nexus EDU Web` client. Google Analytics and Gemini were left disabled.
- Provisioned the default Standard Cloud Firestore database in `me-central2` (Dammam), starting in production mode with all client reads and writes denied. The database is empty and is not connected to the current Prisma/PostgreSQL API.
- Updated `firestore.rules` to deny all client access until a verified Firebase identity, role, school scope, and ownership model exists. Do not deploy a more permissive policy without rules tests.
- The actual school API still has no verified production PostgreSQL connection or live API service. See [the free-infrastructure status](docs/NEXUS_FREE_INFRASTRUCTURE_STATUS.md) before entering real school data.

# Million Platform - دليل النشر على VPS

## المتطلبات

### من Hostinger:
- **خطة VPS**: KVM 2 أو أعلى (4GB RAM minimum)
- **نظام التشغيل**: Ubuntu 22.04 LTS
- **الدومين**: مثل `million-platform.com`

> ⚠️ **تحذير**: الاستضافة المشتركة (Shared Hosting) لن تعمل! يجب استخدام VPS.

---

## خطوات النشر

### 1️⃣ إعداد السيرفر الأولي

```bash
# الاتصال بالسيرفر
ssh root@your-server-ip

# تحميل وتشغيل سكربت الإعداد
wget https://raw.githubusercontent.com/your-repo/million-platform/main/deploy/scripts/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

### 2️⃣ استنساخ المشروع

```bash
cd /var/www/million-platform
git clone https://github.com/your-username/million-platform.git .
```

### 3️⃣ إعداد البيئة

```bash
# نسخ ملف البيئة
cp .env.production .env

# تعديل المتغيرات
nano .env
```

**المتغيرات الضرورية:**
- `DATABASE_URL`: رابط قاعدة البيانات
- `JWT_SECRET`: مفتاح سري (استخدم `openssl rand -base64 32`)
- `FRONTEND_URL`: رابط الموقع `https://million-platform.com`
- `API_URL`: رابط الـ API `https://api.million-platform.com`

### 4️⃣ تشغيل قاعدة البيانات

```bash
docker compose -f docker-compose.prod.yml up -d postgres redis
```

### 5️⃣ بناء وتشغيل التطبيقات

```bash
# تثبيت الاعتماديات
npm install

# تشغيل migrations
cd apps/api
npx prisma migrate deploy --schema=../../prisma-backend/prisma/schema.prisma
cd ../..

# بناء التطبيقات
npm run build

# تشغيل باستخدام PM2
pm2 start ecosystem.config.js
pm2 save
```

### 6️⃣ إعداد Nginx

```bash
# نسخ الإعدادات
sudo cp deploy/nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp deploy/nginx/sites/million-platform.conf /etc/nginx/sites-enabled/

# تعديل اسم الدومين
sudo nano /etc/nginx/sites-enabled/million-platform.conf
# استبدل million-platform.com بدومينك

# اختبار الإعدادات
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl reload nginx
```

### 7️⃣ الحصول على شهادة SSL

```bash
sudo certbot --nginx -d your-domain.com -d api.your-domain.com -d www.your-domain.com
```

---

## التحديثات المستقبلية

```bash
cd /var/www/million-platform
./deploy/scripts/deploy.sh
```

---

## النسخ الاحتياطي التلقائي

```bash
# إضافة للـ crontab
crontab -e

# إضافة هذا السطر (يومياً الساعة 2 صباحاً)
0 2 * * * /var/www/million-platform/deploy/scripts/backup.sh
```

---

## الأوامر المفيدة

| الأمر | الوصف |
|-------|-------|
| `pm2 status` | حالة التطبيقات |
| `pm2 logs` | عرض اللوجات |
| `pm2 restart all` | إعادة تشغيل |
| `docker compose -f docker-compose.prod.yml logs` | لوجات Docker |

---

## التحقق من الصحة

```bash
# فحص الـ API
curl https://api.your-domain.com/api/health

# فحص الموقع
curl -I https://your-domain.com
```
