# Legacy Firebase Prototype - Do Not Deploy

> This directory is not the active Nexus backend. Its project alias is being
> aligned to `nexus-edu-ikhlas-jeddah-2026`, but the functions require Firebase
> Blaze and this code has not passed production security review. Keep its rules
> deny-all and do not deploy these functions on the Spark-only project.

The earlier claim that this bundle is "100% Free Tier Compatible" is incorrect:
Cloud Functions deployments require Blaze and a linked billing account. The
active Nexus API uses NestJS/Prisma and is not connected to this prototype.

## Legacy notes

The original prototype documentation follows for reference only. Its old rules
permit unauthenticated notification and audit-log writes, and its scheduled
invoice function has hard-coded fee defaults. Do not treat it as production
ready or as a source of real school records.

---

# Million EdTech - Legacy Firebase Prototype

The sections below describe prototype intent only. They are not an inventory of
live Nexus features, a production-readiness claim, or a free-tier deployment plan.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Security Rules](#security-rules)
- [Cloud Functions](#cloud-functions)
- [Setup Guide](#setup-guide)
- [Deployment](#deployment)
- [API Usage](#api-usage)
- [Testing](#testing)

## Prototype scope (unverified)

The original prototype sketches Auth, Firestore, Cloud Functions, Storage, and
realtime updates. None of those descriptions certify that the implementation is
secure, deployed, or suitable for school records. No student-capacity guarantee
has been established.

## 🏗️ Architecture

```
Frontend (Next.js)
  ↓ Firebase SDK
Firebase Services
  ├── Authentication (Email, Google, Microsoft SSO)
  ├── Firestore (NoSQL Database)
  ├── Cloud Functions (Serverless)
  └── Storage (File uploads)
```

## 🗄️ Data Model

### Collections

1. **users** - User profiles with role
2. **schools** - Educational institutions
3. **classes** - Classes within schools
4. **subjects** - Subjects/courses
5. **enrollments** - Student↔Class mapping
6. **parentStudents** - Parent↔Student relationships
7. **assignments** - Teacher assignments
8. **submissions** - Student submissions
9. **grades** - Student grades
10. **attendance** - Daily attendance
11. **payments** - Student fees/invoices
12. **notifications** - User notifications
13. **messages** - In-class messaging
14. **auditLogs** - System audit trail
15. **assignmentSummaries** - Analytics data

### Example Document Structure

```typescript
// users/{userId}
{
  email: "student@kfis.edu.sa",
  fullName: "Ahmed Ali",
  role: "student", // student | teacher | parent | admin
  phoneNumber: "+966501234567",
  avatarUrl: "https://...",
  isActive: true,
  createdAt: Timestamp,
  metadata: {
    busService: true,
    discountPercentage: 10
  }
}

// assignments/{assignmentId}
{
  classId: "class123",
  teacherId: "teacher123",
  title: "Algebra Chapter 3",
  description: "Complete exercises",
  dueDate: Timestamp,
  totalPoints: 100,
  status: "published", // draft | published | closed
  metadata: {
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        question: "What is 2+2?",
        correctAnswer: "4",
        points: 10
      }
    ]
  }
}
```

## 🔐 Security Rules

### Role-Based Access Control (RBAC)

Firebase Auth custom claims set user roles:

```typescript
// Set role via Cloud Function
await admin.auth().setCustomUserClaims(userId, { role: 'teacher' });
```

### Firestore Rules Examples

```javascript
// Students can read published assignments in their classes
allow read: if resource.data.status == 'published' && 
               isEnrolledInClass(resource.data.classId);

// Teachers can manage their assignments
allow write: if resource.data.teacherId == request.auth.uid;

// Parents can read their children's grades
allow read: if isParentOf(resource.data.studentId);
```

### Storage Rules

```javascript
// Users upload their own profile images (max 2MB)
allow write: if request.auth.uid == userId && 
                request.resource.size < 2 * 1024 * 1024;

// Students upload assignment attachments
allow write: if request.auth.uid == userId && 
                request.resource.size < 10 * 1024 * 1024;
```

## ⚡ Cloud Functions

### 1. onCreateAssignment

**Trigger:** Firestore onCreate (`assignments/{id}`)

**Purpose:** Send notifications to all students when assignment is created

```typescript
// Automatically triggered when teacher creates assignment
// - Finds all enrolled students
// - Creates notification for each
// - Sends push notification (FCM)
// - Creates analytics summary
```

### 2. onSubmission

**Trigger:** Firestore onCreate (`submissions/{id}`)

**Purpose:** Auto-grade objective questions

```typescript
// Auto-grades multiple choice, true/false questions
// - Checks answers against correct answers
// - Calculates grade
// - Updates submission status
// - Creates grade record
// - Notifies student
```

### 3. generateMonthlyInvoices

**Trigger:** Scheduled (1st of every month, midnight Riyadh time)

**Purpose:** Generate monthly invoices for all students

```typescript
// Runs automatically every month
// - Gets all active enrollments
// - Calculates fees (tuition + optional services)
// - Applies discounts
// - Creates payment records
// - Sends notifications
```

### 4. setUserRole (Callable)

**Trigger:** Client call

**Purpose:** Admin sets user roles

```typescript
// Called by admins to assign roles
const result = await functions.httpsCallable('setUserRole')({
  userId: 'user123',
  role: 'teacher'
});
```

### 5. onUserCreate

**Trigger:** Firebase Auth onCreate

**Purpose:** Initialize Firestore user document

```typescript
// Automatically creates Firestore doc when user signs up
// Sets default role: 'student'
```

## 🚀 Setup Guide

### Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project (free tier)

### Step 1: Create Firebase Project

```bash
# Login to Firebase
firebase login

# Create new project at https://console.firebase.google.com
```

### Step 2: Initialize Firebase

```bash
# Navigate to project root
cd million-platform/firebase

# Initialize Firebase (if not already done)
firebase init

# Select:
# - Firestore
# - Functions (TypeScript)
# - Storage
# - Emulators
```

### Step 3: Configure Project

```bash
# Set your project ID in .firebaserc
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

### Step 4: Install Dependencies

```bash
cd functions
npm install
cd ..
```

### Step 5: Enable Authentication

In Firebase Console → Authentication → Sign-in method:

1. **Email/Password** - Enable
2. **Google** - Enable (add OAuth credentials)
3. **Microsoft** - Enable (add Azure AD credentials)

### Step 6: Deploy Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Step 7: Deploy Functions

```bash
# Build functions
cd functions
npm run build

# Deploy
firebase deploy --only functions
```

## 📦 Deployment Methods

### 1. Firebase CLI (Manual)

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only functions
firebase deploy --only firestore:indexes
```

### 2. GitHub Actions (CI/CD)

Setup secrets in GitHub:
- Go to: Settings → Secrets → Actions
- Add: `FIREBASE_TOKEN`

Generate token:
```bash
firebase login:ci
# Copy the token and add to GitHub secrets
```

Push to main branch → auto-deploy! 🎉

### 3. Staging vs Production

```bash
# Create staging project
firebase use --add

# Deploy to staging
firebase use staging
firebase deploy

# Deploy to production
firebase use default
firebase deploy
```

## 💻 API Usage

### Initialize Firebase SDK

```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
```

### Authentication Examples

```typescript
import { auth } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';

// Sign up
const { user } = await createUserWithEmailAndPassword(
  auth,
  'student@kfis.edu.sa',
  'password123'
);

// Sign in
await signInWithEmailAndPassword(auth, email, password);

// Google Sign-in
const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);

// Get current user role
const idTokenResult = await auth.currentUser?.getIdTokenResult();
const role = idTokenResult?.claims.role; // 'student' | 'teacher' | ...
```

### Firestore CRUD

```typescript
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';

// Get student's assignments
const assignmentsRef = collection(db, 'assignments');
const q = query(
  assignmentsRef,
  where('classId', '==', classId),
  where('status', '==', 'published'),
  orderBy('dueDate', 'asc')
);
const snapshot = await getDocs(q);
const assignments = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));

// Submit assignment
await addDoc(collection(db, 'submissions'), {
  assignmentId,
  studentId: auth.currentUser!.uid,
  content: 'My answer...',
  attachmentUrls: ['https://...'],
  status: 'pending',
  submittedAt: serverTimestamp()
});

// Update profile
await updateDoc(doc(db, 'users', userId), {
  fullName: 'New Name',
  phoneNumber: '+966...'
});
```

### Realtime Listeners

```typescript
import { onSnapshot } from 'firebase/firestore';

// Listen to assignment updates
const unsubscribe = onSnapshot(
  doc(db, 'assignments', assignmentId),
  (doc) => {
    console.log('Assignment updated:', doc.data());
  }
);

// Listen to new messages
onSnapshot(
  query(
    collection(db, 'messages'),
    where('classId', '==', classId),
    orderBy('createdAt', 'desc')
  ),
  (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        console.log('New message:', change.doc.data());
      }
    });
  }
);

// Cleanup
unsubscribe();
```

### Cloud Functions (Callable)

```typescript
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';

// Set user role (admin only)
const setRole = httpsCallable(functions, 'setUserRole');
const result = await setRole({
  userId: 'user123',
  role: 'teacher'
});
```

### Storage Upload

```typescript
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Upload profile image
const fileRef = ref(storage, `profile-images/${userId}/avatar.png`);
await uploadBytes(fileRef, file);
const url = await getDownloadURL(fileRef);

// Upload assignment attachment
const attachmentRef = ref(
  storage,
  `attachments/${userId}/${assignmentId}/${file.name}`
);
await uploadBytes(attachmentRef, file);
```

## 🧪 Testing

### Local Emulators

```bash
# Start emulators
firebase emulators:start

# Services available at:
# - Auth: localhost:9099
# - Firestore: localhost:8080
# - Functions: localhost:5001
# - Storage: localhost:9199
# - UI: localhost:4000
```

### Connect Frontend to Emulators

```typescript
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectFunctionsEmulator } from 'firebase/functions';
import { connectStorageEmulator } from 'firebase/storage';

if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

## Billing and quota warning

Cloud Functions deployments require the Blaze plan and a linked billing
account; they are unavailable under the Spark-only constraint. Firestore Spark
quotas are product-specific and can shut off that product when exceeded. Check
the current [Firebase pricing plans](https://firebase.google.com/pricing) and
[Cloud Functions deployment requirements](https://firebase.google.com/docs/functions/get-started)
before making infrastructure decisions. This legacy prototype is deliberately
not deployable from the current repository workflow.

## 📚 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 🔗 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## 🆚 Firebase vs Supabase

| Feature | Firebase | Supabase |
|---------|----------|----------|
| **Database** | Firestore (No SQL) | PostgreSQL (SQL) |
| **Auth** | Built-in + Custom Claims | Built-in + RLS |
| **Realtime** | Firestore listeners | PostgreSQL subscriptions |
| **Functions** | Cloud Functions (JS/TS) | Edge Functions (Deno) |
| **Pricing** | Check current Firebase plan and quotas | Check current Supabase plan and quotas |
| **Best For** | Real-time apps, Mobile | Complex queries, Relational data |

---

**Built with ❤️ for Saudi EdTech** 🇸🇦🔥
