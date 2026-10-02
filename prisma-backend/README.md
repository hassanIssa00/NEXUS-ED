# Million EdTech - Prisma + Postgres + Node Backend 🚀

**Professional-grade** backend for EdTech platform with Prisma ORM, PostgreSQL, JWT Auth, Stripe Payments, and BullMQ Workers.

## 📋 Features

- ✅ **Prisma ORM** - Type-safe database client
- ✅ **PostgreSQL** - Relational database
- ✅ **JWT Auth** - Access + Refresh tokens
- ✅ **Role-based Access Control** - Student/Teacher/Parent/Admin
- ✅ **Stripe Integration** - Payments & Invoices
- ✅ **BullMQ Workers** - Background jobs (reports, emails)
- ✅ **Redis** - Caching & job queue
- ✅ **Docker** - Local development
- ✅ **TypeScript** - Full type safety

---

## 🏗️ Architecture

```
prisma-backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Migrations
│   └── seed.ts           # Seed data
├── src/
│   ├── server.ts         # Express app
│   ├── routes/           # API routes
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── classes.routes.ts
│   │   ├── assignments.routes.ts
│   │   ├── submissions.routes.ts
│   │   ├── grades.routes.ts
│   │   └── payments.routes.ts
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, RBAC, etc
│   ├── utils/            # Helpers
│   └── workers/          # Background jobs
├── docker-compose.yml    # Local infra
└── package.json
```

---

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### **Step 1: Clone & Install**

```bash
cd prisma-backend
npm install
```

### **Step 2: Start Infrastructure**

```bash
# Start Postgres + Redis + Adminer
docker-compose up -d

# Check status
docker ps
```

### **Step 3: Configure Environment**

Create `.env`:

```bash
# Database
DATABASE_URL="postgresql://million:million_dev_2024@localhost:5432/million_edtech"

# JWT Secrets
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://localhost:6379"

# Stripe (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
PORT=4000
NODE_ENV="development"
```

### **Step 4: Setup Database**

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Safe no-op; this command does not create default accounts or synthetic records
npm run db:seed

# (Optional) Open Prisma Studio
npm run db:studio
```

### **Step 5: Run Backend**

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

**API will be available at:** `http://localhost:4000`

### **Step 6: Run Background Workers**

```bash
# In a separate terminal
npm run worker
```

---

## 🔐 Authentication

### **Register**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@kfis.edu.sa",
  "password": "SecurePass123!",
  "fullName": "Ahmed Ali",
  "role": "STUDENT"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "student@kfis.edu.sa",
    "fullName": "Ahmed Ali",
    "role": "STUDENT"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### **Login**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@kfis.edu.sa",
  "password": "SecurePass123!"
}
```

### **Refresh Token**

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### **Authenticated Requests**

```http
GET /api/users/me
Authorization: Bearer <accessToken>
```

---

## 📡 API Endpoints

### **Auth**

| Method | Endpoint           | Description         | Auth |
|--------|--------------------|---------------------|------|
| POST   | /api/auth/register | Register new user   | ❌   |
| POST   | /api/auth/login    | Login               | ❌   |
| POST   | /api/auth/refresh  | Refresh tokens      | ❌   |
| POST   | /api/auth/logout   | Logout              | ✅   |
| GET    | /api/auth/me       | Get current user    | ✅   |

### **Users**

| Method | Endpoint           | Description      | Roles       |
|--------|--------------------|------------------|-------------|
| GET    | /api/users         | List users       | Admin       |
| GET    | /api/users/:id     | Get user         | Admin, Self |
| PUT    | /api/users/:id     | Update user      | Admin, Self |
| DELETE | /api/users/:id     | Delete user      | Admin       |

### **Classes**

| Method | Endpoint            | Description      | Roles          |
|--------|---------------------|------------------|----------------|
| GET    | /api/classes        | List classes     | All            |
| POST   | /api/classes        | Create class     | Admin          |
| GET    | /api/classes/:id    | Get class        | All            |
| PUT    | /api/classes/:id    | Update class     | Admin, Teacher |
| DELETE | /api/classes/:id    | Delete class     | Admin          |

### **Assignments**

| Method | Endpoint                 | Description         | Roles   |
|--------|--------------------------|---------------------|---------|
| GET    | /api/assignments         | List assignments    | All     |
| POST   | /api/assignments         | Create assignment   | Teacher |
| GET    | /api/assignments/:id     | Get assignment      | All     |
| PUT    | /api/assignments/:id     | Update assignment   | Teacher |
| DELETE | /api/assignments/:id     | Delete assignment   | Teacher |

### **Submissions**

| Method | Endpoint                     | Description        | Roles          |
|--------|------------------------------|--------------------|----------------|
| GET    | /api/submissions             | List submissions   | Teacher        |
| POST   | /api/submissions             | Submit assignment  | Student        |
| GET    | /api/submissions/:id         | Get submission     | Teacher, Owner |
| PUT    | /api/submissions/:id/grade   | Grade submission   | Teacher        |

### **Grades**

| Method | Endpoint            | Description    | Roles               |
|--------|---------------------|----------------|---------------------|
| GET    | /api/grades         | List grades    | Teacher, Student    |
| POST   | /api/grades         | Create grade   | Teacher             |
| GET    | /api/grades/:id     | Get grade      | Teacher, Student    |

### **Payments**

| Method | Endpoint                      | Description           | Roles         |
|--------|-------------------------------|-----------------------|---------------|
| GET    | /api/payments                 | List payments         | Admin, Parent |
| POST   | /api/payments                 | Create invoice        | Admin         |
| GET    | /api/payments/:id             | Get payment           | Admin, Parent |
| POST   | /api/payments/:id/checkout    | Create Stripe session | Parent        |
| POST   | /api/payments/webhook         | Stripe webhook        | Public        |

---

## 🛡️ Role-Based Access Control (RBAC)

### **Middleware Usage**

```typescript
import { authenticate, authorize } from './middleware/auth';

// Only authenticated users
router.get('/profile', authenticate, getProfile);

// Only admins
router.delete('/users/:id', authenticate, authorize(['ADMIN']), deleteUser);

// Teachers and admins
router.post('/assignments', authenticate, authorize(['TEACHER', 'ADMIN']), createAssignment);
```

### **Role Permissions**

| Role    | Permissions                                      |
|---------|--------------------------------------------------|
| ADMIN   | Full access to all resources                     |
| TEACHER | Manage own classes, assignments, grade students  |
| STUDENT | View classes, submit assignments, view grades    |
| PARENT  | View children's data, make payments              |

---

## 💳 Stripe Integration

### **Create Payment Intent**

```typescript
// Example: Create invoice for student
POST /api/payments
{
  "studentId": "uuid",
  "amount": 1500,
  "description": "رسوم شهر يناير 2025"
}
```

### **Checkout Session**

```typescript
// Parent creates checkout session
POST /api/payments/:id/checkout

Response:
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### **Webhook Handler**

```typescript
// Stripe sends webhook after successful payment
POST /api/payments/webhook
Stripe-Signature: ...

// Backend:
// 1. Verify signature
// 2. Update payment status
// 3. Send notification
// 4. Generate invoice PDF
```

---

## 🔄 Background Workers (BullMQ)

### **Job Types**

1. **Generate Monthly Invoices**
```typescript
// Runs on 1st of every month
generateMonthlyInvoicesJob()
```

2. **Send Batch Notifications**
```typescript
// Send assignment notifications
sendNotificationsJob({ assignmentId, studentIds })
```

3. **Generate Reports**
```typescript
// Generate student grade report
generateReportJob({ studentId, term })
```

### **Queue Dashboard**

```
http://localhost:8081
```

---

## 🗂️ Database Schema

### **Main Entities**

```
User (15 fields)
  ├── RefreshToken
  ├── Enrollment → Class
  ├── Assignment (teacher)
  ├── Submission (student)
  ├── Grade
  ├── Attendance
  ├── Payment
  └── Notification

Class
  ├── School
  ├── Teacher (User)
  ├── Enrollment → Student
  ├── Assignment
  └── ClassSubject → Subject

Assignment
  ├── Class
  ├── Teacher
  └── Submission[]

Payment
  ├── Student
  ├── Parent
  └── Stripe Integration
```

### **View Schema**

```bash
npx prisma studio
# Opens at: http://localhost:5555
```

---

## 🧪 Testing

### **Unit Tests**

```bash
npm test
```

### **API Testing (Postman/Insomnia)**

Import collection: `postman_collection.json`

### **Requests**

```bash
# Create assignment
curl -X POST http://localhost:4000/api/assignments \
  -H "Authorization: Bearer <token-from-a-provisioned-account>" \
  -d '{"classId":"...","title":"Math Quiz"}'
```

---

## 🚢 Deployment

### **Production Environment Variables**

```bash
DATABASE_URL="postgresql://user:pass@production-db:5432/million"
JWT_SECRET="<strong-random-secret>"
STRIPE_SECRET_KEY="sk_live_..."
REDIS_URL="redis://production-redis:6379"
NODE_ENV="production"
```

### **Deploy to Railway/Render/Heroku**

```bash
# Build
npm run build

# Migrate production DB
npx prisma migrate deploy

# Start
npm start
```

### **Deploy with Docker**

```bash
docker build -t million-backend .
docker run -p 4000:4000 million-backend
```

---

## 📊 Monitoring

### **Database**

```bash
# Adminer UI
http://localhost:8080
```

### **Redis**

```bash
# Redis Commander
http://localhost:8081
```

### **Logs**

```bash
# Development
NODE_ENV=development npm run dev

# Production (with Winston)
tail -f logs/combined.log
```

---

## 🆚 Comparison: Prisma vs Supabase vs Firebase

| Feature           | Prisma + Node | Supabase    | Firebase    |
|-------------------|---------------|-------------|-------------|
| **Database**      | PostgreSQL    | PostgreSQL  | Firestore   |
| **Type**          | SQL (Relational) | SQL      | NoSQL       |
| **Auth**          | Custom JWT    | Built-in    | Built-in    |
| **Realtime**      | Custom (WebSockets) | Built-in | Built-in |
| **Control**       | Full          | Medium      | Low         |
| **Complexity**    | High          | Low         | Low         |
| **Cost (Free)**   | Self-hosted   | 500MB       | 1GB         |
| **Best For**      | Complex apps  | Rapid dev   | Mobile apps |

---

## 🔗 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [BullMQ Guide](https://docs.bullmq.io/)
- [Stripe API](https://stripe.com/docs/api)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 💡 Next Steps

1. ✅ Implement remaining controllers (see `src/controllers/`)
2. ✅ Add unit tests
3. ✅ Setup CI/CD pipeline
4. ✅ Add API documentation (Swagger)
5. ✅ Implement file upload (S3/Cloudinary)
6. ✅ Add rate limiting
7. ✅ Setup monitoring (Sentry/DataDog)

---

**Built with ❤️ for Saudi EdTech** 🇸🇦
