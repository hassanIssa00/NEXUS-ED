# Million EdTech - Supabase Backend Blueprint 🚀

Complete Supabase backend for a Saudi EdTech platform with **free tier optimization**.

## 📋 Table of Contents

- [Features](#features)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [Storage](#storage)
- [Edge Functions](#edge-functions)
- [Realtime](#realtime)
- [Deployment Guide](#deployment-guide)
- [API Examples](#api-examples)
- [Cost Optimization](#cost-optimization)

## ✨ Features

- ✅ **15 Tables** with relationships (users, schools, classes, enrollments, assignments, submissions, grades, attendance, payments, notifications)
- ✅ **Row Level Security (RLS)** policies for student, teacher, parent, admin roles
- ✅ **Email/Password + SSO** (Google/Microsoft) authentication
- ✅ **Storage buckets** for profile images, course assets, attachments
- ✅ **3 Edge Functions** (create-assignment, auto-grade, generate-invoices)
- ✅ **Realtime** for live attendance and messaging
- ✅ **Audit logs** for compliance
- ✅ **Seed data** for testing

## 🗄️ Database Schema

### Core Tables

1. **users** - Extends Supabase auth with role (student/teacher/parent/admin)
2. **schools** - Educational institutions
3. **classes** - Classes within schools
4. **subjects** - Subjects/courses
5. **class_subjects** - Many-to-many mapping
6. **enrollments** - Student enrollments in classes
7. **parent_students** - Parent-child relationships

### Academic Tables

8. **assignments** - Teacher assignments
9. **submissions** - Student submissions
10. **grades** - Student grades
11. **attendance** - Daily attendance tracking

### Financial & Communication

12. **payments** - Student fees/invoices
13. **notifications** - User notifications
14. **messages** - In-class messaging
15. **audit_logs** - System audit trail

### Relationships Diagram

```
users (role: student/teacher/parent/admin)
  ├── teacher → classes (1:many)
  ├── student → enrollments → classes (many:many)
  ├── parent → parent_students → student (many:many)
  └── teacher → assignments (1:many)

classes
  ├── class_subjects → subjects (many:many)
  ├── assignments (1:many)
  ├── enrollments (1:many)
  ├── attendance (1:many)
  └── messages (1:many)

assignments
  └── submissions → students (1:many)
      └── grades (1:1)
```

## 🔐 Authentication & Authorization

### Auth Methods

1. **Email/Password** - Built-in Supabase auth
2. **Google SSO** - Via Supabase OAuth
3. **Microsoft SSO** - For school accounts

### Role-Based Access Control (RBAC)

| Role    | Permissions |
|---------|-------------|
| **Admin** | Full access to all tables, can manage users, schools, classes |
| **Teacher** | View/edit own classes, assignments, grades, attendance |
| **Student** | View enrolled classes, submit assignments, view own grades |
| **Parent** | View children's data (grades, attendance, payments) |

### RLS Policy Examples

```sql
-- Students can view published assignments in their classes
CREATE POLICY "Students can view published assignments"
  ON public.assignments FOR SELECT
  USING (
    status = 'published' AND
    auth.is_enrolled(class_id)
  );

-- Teachers can grade submissions in their classes
CREATE POLICY "Teachers can grade submissions"
  ON public.submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
    )
  );
```

## 📦 Storage

### Buckets

| Bucket | Public | Purpose | Max Size |
|--------|--------|---------|----------|
| `profile-images` | ✅ Yes | User avatars | 2MB per file |
| `course-assets` | ❌ No | Course materials (PDFs, videos) | 50MB per file |
| `attachments` | ❌ No | Assignment submissions | 10MB per file |
| `invoices` | ❌ No | Payment invoices (PDF) | 5MB per file |

### Storage Policies

```sql
-- Users can upload their own profile image
CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Upload Example (TypeScript)

```typescript
const { data, error } = await supabase.storage
  .from('profile-images')
  .upload(`${user.id}/avatar.png`, file, {
    cacheControl: '3600',
    upsert: true
  });
```

## ⚡ Edge Functions

### 1. create-assignment

**Endpoint:** `POST /functions/v1/create-assignment`

**Description:** Creates an assignment and notifies all students in the class.

**Request:**
```json
{
  "class_id": "uuid",
  "subject_id": "uuid",
  "title": "Algebra Chapter 3",
  "description": "Complete exercises 1-10",
  "due_date": "2025-01-15T23:59:00Z",
  "total_points": 100,
  "status": "published"
}
```

**Response:**
```json
{
  "success": true,
  "assignment": { "id": "uuid", ... },
  "notifications_sent": 25
}
```

### 2. auto-grade

**Endpoint:** `POST /functions/v1/auto-grade`

**Description:** Auto-grades objective questions (multiple choice, true/false).

**Request:**
```json
{
  "submission_id": "uuid",
  "answers": [
    { "question_id": "q1", "answer": "B" },
    { "question_id": "q2", "answer": "true" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "grade": 85,
  "total_points": 100,
  "percentage": "85.00",
  "grading_details": [...]
}
```

### 3. generate-invoices

**Endpoint:** `POST /functions/v1/generate-invoices`

**Description:** Generates monthly invoices for all active students.

**Request:**
```json
{
  "month": 1,
  "year": 2025
}
```

**Response:**
```json
{
  "success": true,
  "invoices_generated": 250,
  "total_amount": 375000,
  "errors": []
}
```

## 🔴 Realtime

### Enable Realtime on Tables

```sql
-- Enable realtime for attendance (live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- Enable realtime for messages (in-class chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Subscribe to Realtime (TypeScript)

```typescript
// Live attendance updates
const attendanceChannel = supabase
  .channel('attendance-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'attendance',
      filter: `class_id=eq.${classId}`
    },
    (payload) => {
      console.log('Attendance updated:', payload);
      // Update UI
    }
  )
  .subscribe();

// In turn messaging
const messagesChannel = supabase
  .channel(`class-${classId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `class_id=eq.${classId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
      // Display message
    }
  )
  .subscribe();
```

## 🚀 Deployment Guide

### Prerequisites

- Node.js 18+
- Supabase CLI: `npm install -g supabase`
- Supabase account (free tier)

### Step 1: Create Supabase Project

```bash
# Login to Supabase
supabase login

# Create new project (or use existing)
# Visit: https://app.supabase.com
```

### Step 2: Link Project

```bash
# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref <your-project-ref>
```

### Step 3: Run Migrations

```bash
# Apply schema migration
supabase db push

# Or reset and apply all migrations
supabase db reset
```

### Step 4: Apply RLS Policies

```bash
# Run policies.sql
psql -h <db-host> -U postgres -d postgres -f supabase/policies.sql
```

### Step 5: Configure Auth Providers

In Supabase Dashboard → Authentication → Providers:

1. **Google OAuth**
   - Enable Google provider
   - Add Client ID and Secret
   - Add redirect URL: `https://<project-ref>.supabase.co/auth/v1/callback`

2. **Microsoft OAuth**
   - Enable Azure provider
   - Add Client ID and Secret
   - Configure tenant for school accounts

### Step 6: Deploy Edge Functions

```bash
# Deploy create-assignment function
supabase functions deploy create-assignment

# Deploy auto-grade function
supabase functions deploy auto-grade

# Deploy generate-invoices function
supabase functions deploy generate-invoices
```

### Step 7: Set Environment Variables

```bash
# Set secrets for edge functions
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_ANON_KEY=<your-anon-key>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Step 8: Configure Storage (No Demo Records)

```bash
# Creates storage buckets and policies only; does not create school or user records
psql -h <db-host> -U postgres -d postgres -f supabase/seed.sql
```

### Step 9: Configure Storage

In Supabase Dashboard → Storage:
- The SQL script creates buckets and policies; it does not create users, classes, grades, or other school records.

## 📡 API Examples

### Authentication

```typescript
// Sign up with email
const { data, error } = await supabase.auth.signUp({
  email: 'student@kfis.edu.sa',
  password: 'secure_password',
  options: {
    data: {
      full_name: 'Ahmed Ali',
      role: 'student'
    }
  }
});

// Sign in with Google
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://yourapp.com/auth/callback'
  }
});
```

### CRUD Operations

```typescript
// Get student's assignments
const { data: assignments } = await supabase
  .from('assignments')
  .select(`
    *,
    subject:subjects(name, name_ar),
    submissions(id, status, grade)
  `)
  .eq('status', 'published')
  .order('due_date', { ascending: true });

// Submit assignment
const { data: submission } = await supabase
  .from('submissions')
  .insert({
    assignment_id: assignmentId,
    student_id: user.id,
    content: 'My answer...',
    attachment_urls: ['https://...']
  })
  .select()
  .single();

// Teacher: Mark attendance
const { data } = await supabase
  .from('attendance')
  .upsert({
    student_id: studentId,
    class_id: classId,
    date: '2025-01-15',
    status: 'present',
    marked_by: teacherId
  });
```

## 💰 Cost Optimization (Free Tier)

Supabase Free Tier Limits:
- ✅ **Database:** 500MB (enough for 10K+ students)
- ✅ **Storage:** 1GB (compress images, limit file sizes)
- ✅ **Bandwidth:** 2GB/month
- ✅ **Edge Functions:** 500K invocations/month
- ✅ **Realtime:** 2M messages/month

### Optimization Tips

1. **Use indexes** - Already added in schema
2. **Compress images** - Resize profile pictures to 200x200
3. **Cache frequently accessed data** - Use React Query or SWR
4. **Lazy load** - Paginate large lists
5. **Archive old data** - Move old submissions to cold storage

## 🔧 Environment Variables (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

## 🤝 Support

For questions or issues:
- Check [Supabase Community](https://github.com/supabase/supabase/discussions)
- Review [SQL Schema](./migrations/001_initial_schema.sql)
- Test with [Seed Data](./seed.sql)

---

**Built with ❤️ for Saudi EdTech** 🇸🇦
