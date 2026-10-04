# 🌟 Comprehensive Documentation for NEXUS EDU Platform

## 📌 1. Project Overview (Platform Vision)
**NEXUS EDU** (formerly Million Platform) is an intelligent, integrated educational platform aiming to revolutionize the school education experience by combining Artificial Intelligence (AI), Gamification, and administrative automation tools.
The platform provides an interconnected environment that brings together **Students**, **Teachers**, **Parents**, and **School Administration** in one place to deliver an enjoyable, interactive, and measurable educational journey.

---

## 🏗️ 2. Technical Architecture
The project is built using a **Monorepo** architecture powered by `Turborepo` to easily manage both the front-end and back-end in a single repository.

### 🌐 Front-end (Web App)
* **Framework:** Next.js 16 (App Router).
* **Language:** TypeScript.
* **Styling:** TailwindCSS + Shadcn UI (featuring dark mode and glassmorphism designs).
* **State & Data Management:** React Query & Zustand.
* **Internationalization:** Next-Intl (supporting Arabic and English).

### ⚙️ Back-end (API)
* **Framework:** NestJS (scalable and robust architecture).
* **Database:** PostgreSQL (hosted on Supabase).
* **ORM:** Prisma v6.
* **Real-time Communication:** Socket.IO (for chats and live notifications).
* **Security:** JWT Authentication, Rate Limiting, Helmet.

---

## 🚀 3. Core Features

### 🧑‍🎓 Student Portal
1. **Gamification System:** "Million Journey", Experience Points (XP), levels, achievement badges, and Leaderboards.
2. **AI Smart Tutor:** An AI assistant that explains lessons, analyzes weaknesses, and provides personalized content based on the student's "Smart Profile".
3. **Assignments & Lessons:** View and submit assignments, and track completion progress.
4. **Educational Games:** Interactive environments to learn subjects through play and competition.

### 👨‍🏫 Teacher Portal
1. **AI Content Generator:** A tool to generate lesson plans, question banks, and assignments with a single click.
2. **Auto-Grading:** Automatically grades assignments and provides instant feedback to students.
3. **QR Attendance:** A rapid attendance system using QR code scanning inside the classroom.
4. **Student Risk Report:** A dashboard tracking students at risk of academic decline based on their absences and grades.

### 👨‍👩‍👦 Parent Portal
1. **AI Parent Advisor:** An AI that reads the student's data and advises parents on how to assist their child at home.
2. **Live Tracking:** Real-time tracking of student attendance, overdue assignments, and academic level.
3. **Scheduled Reports:** Automatically receive detailed periodic performance reports.

### 🏛️ Administration Portal (School Management)
1. Includes multiple roles: (Principal, Vice Principal, Student Counselor, Educational Supervisor, Accountant).
2. Management of class schedules, classrooms, and teachers.
3. Comprehensive school analytics to evaluate overall performance.

---

## 🛠️ 4. Development Timeline & Achievements

1. **UI/UX Design & Development:** Developed more than 5 distinct portals with a modern design reflecting the NEXUS EDU brand identity.
2. **Back-end & Database Modeling:** Designed a massive and complex `schema.prisma` linking all school entities (subjects, classes, assessments, gamification).
3. **AI Integration:** Integrated the API with `OpenAI` models to build custom AI assistants for teachers and students.
4. **Elimination of Mock Data:** Replaced all mock/dummy data with real connections to the production database.
5. **Production Deployment:**
   * The currently deployed web frontend is on Vercel: `https://nexus.masarplatform.org`.
   * The free Neon PostgreSQL database has been created and migrated, with only the real school record seeded; no demo accounts or classes were created.
   * The NestJS API is not deployed or connected to the website. School authentication and PostgreSQL-backed workflows are therefore not production-ready.
   * There is no 100% security guarantee. A suitable API host, production secrets and mail configuration, and live readiness/workflow checks are still required.

---

## 🔑 5. Accounts
The repository does not provide default accounts or shared passwords. Create real accounts through the approved onboarding workflows, and provision initial administrator access securely outside Git.

Older setup files contained synthetic school records. The current setup no longer creates them, but this change does not establish whether those records were previously added to production. Inspect the live database and review any synthetic records before removing them.

---

## 🔗 6. Direct Links
* **Deployed web frontend:** `https://nexus.masarplatform.org`
* **API:** Not deployed; there is no valid production API URL yet.

---
*This documentation serves as a comprehensive guide to the project for stakeholders and future developers.*
