import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

const projectId = 'demo-nexus-rules';
const rules = await readFile(resolve(cwd(), '../../firestore.rules'), 'utf8');
const testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });

const profile = (uid, email, role = 'student', status = 'active') => ({
  uid,
  email,
  full_name: `Test ${uid}`,
  role,
  status,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

try {
  await testEnv.clearFirestore();
  const owner = testEnv.authenticatedContext('owner', {
    email: 'hassan.issa.eng@gmail.com',
    email_verified: true,
  }).firestore();
  const unverifiedOwner = testEnv.authenticatedContext('unverified-owner', {
    email: 'hassan.issa.eng@gmail.com',
    email_verified: false,
  }).firestore();
  const unverifiedStudent = testEnv.authenticatedContext('unverified-student', {
    email: 'unverified-student@example.test',
    email_verified: false,
  }).firestore();
  const student = testEnv.authenticatedContext('student-1', {
    email: 'student@example.test',
    email_verified: true,
  }).firestore();
  const otherStudent = testEnv.authenticatedContext('student-2', {
    email: 'student2@example.test',
    email_verified: true,
  }).firestore();
  const parent = testEnv.authenticatedContext('parent-1', {
    email: 'parent@example.test',
    email_verified: true,
  }).firestore();
  const otherParent = testEnv.authenticatedContext('parent-2', {
    email: 'parent2@example.test',
    email_verified: true,
  }).firestore();
  const counselor = testEnv.authenticatedContext('counselor-1', {
    email: 'counselor@example.test',
    email_verified: true,
  }).firestore();
  const pendingTeacher = testEnv.authenticatedContext('teacher-pending', {
    email: 'teacher@example.test',
    email_verified: true,
  }).firestore();
  const pendingCounselor = testEnv.authenticatedContext('counselor-pending', {
    email: 'counselor-pending@example.test',
    email_verified: true,
  }).firestore();

  await assertSucceeds(setDoc(doc(owner, 'users/owner'), profile('owner', 'hassan.issa.eng@gmail.com', 'admin', 'active')));
  await assertSucceeds(setDoc(doc(student, 'users/student-1'), profile('student-1', 'student@example.test')));
  await assertSucceeds(setDoc(doc(unverifiedStudent, 'users/unverified-student'), profile('unverified-student', 'unverified-student@example.test')));
  await assertSucceeds(setDoc(doc(parent, 'users/parent-1'), profile('parent-1', 'parent@example.test', 'parent')));
  await assertSucceeds(setDoc(doc(otherParent, 'users/parent-2'), profile('parent-2', 'parent2@example.test', 'parent')));
  await assertFails(setDoc(doc(pendingTeacher, 'users/teacher-active'), profile('teacher-active', 'teacher@example.test', 'teacher', 'active')));
  await assertFails(setDoc(doc(pendingTeacher, 'users/teacher-pending-review'), profile('teacher-pending-review', 'teacher@example.test', 'teacher', 'pending')));
  await assertFails(setDoc(doc(unverifiedOwner, 'users/unverified-owner'), profile('unverified-owner', 'hassan.issa.eng@gmail.com', 'admin', 'active')));
  await assertFails(setDoc(doc(otherStudent, 'users/student-2'), profile('student-2', 'student2@example.test', 'admin', 'active')));

  await assertSucceeds(getDoc(doc(student, 'users/student-1')));
  await assertFails(getDoc(doc(student, 'users/parent-1')));
  await assertFails(getDocs(collection(student, 'users')));
  await assertSucceeds(getDoc(doc(owner, 'users/student-1')));
  await assertFails(updateDoc(doc(student, 'users/student-1'), { role: 'admin', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(student, 'users/student-1'), { status: 'pending', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(unverifiedStudent, 'users/unverified-student'), { gradeLevel: 7, updatedAt: serverTimestamp() }));
  await assertFails(getDoc(doc(student, 'assignments/any')));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/counselor-1'), profile('counselor-1', 'counselor@example.test', 'counselor', 'active'));
    await setDoc(doc(context.firestore(), 'users/counselor-pending'), profile('counselor-pending', 'counselor-pending@example.test', 'counselor', 'pending'));
  });

  const code = 'A1B2C3D4E5F6071829384756ABCDEF01';
  await assertSucceeds(setDoc(doc(student, `studentLinkCodes/${code}`), {
    studentUid: 'student-1',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 6 * 24 * 60 * 60 * 1000),
  }));
  await assertFails(setDoc(doc(unverifiedStudent, 'studentLinkCodes/0123456789ABCDEF0123456789ABCDEF'), {
    studentUid: 'unverified-student',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
  }));
  await assertFails(setDoc(doc(student, 'studentLinkCodes/0123456789ABCDEF'), {
    studentUid: 'student-1',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
  }));
  await assertSucceeds(getDoc(doc(parent, `studentLinkCodes/${code}`)));

  const batch = writeBatch(parent);
  batch.set(doc(parent, 'parentStudentLinks/parent-1_student-1'), {
    parentUid: 'parent-1',
    studentUid: 'student-1',
    linkCode: code,
    createdAt: serverTimestamp(),
  });
  batch.delete(doc(parent, `studentLinkCodes/${code}`));
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(student, 'parentStudentLinks/parent-1_student-1')));
  await assertFails(getDoc(doc(otherParent, 'parentStudentLinks/parent-1_student-1')));
  await assertFails(getDoc(doc(parent, `studentLinkCodes/${code}`)));

  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, index) => [`q${index + 1}`, 'تم الاختيار']));
  await assertSucceeds(setDoc(doc(parent, 'parentSurveys/parent-1_student-1'), {
    parentUid: 'parent-1',
    studentUid: 'student-1',
    answers,
    consent: true,
    consentVersion: 'nexus-parent-survey-v1',
    submittedAt: serverTimestamp(),
  }));
  await assertSucceeds(getDoc(doc(counselor, 'parentSurveys/parent-1_student-1')));
  await assertSucceeds(getDoc(doc(pendingCounselor, 'parentSurveys/parent-1_student-1')));
  await assertFails(getDoc(doc(otherParent, 'parentSurveys/parent-1_student-1')));
  await assertFails(updateDoc(doc(parent, 'parentSurveys/parent-1_student-1'), { consent: false }));
  await assertFails(setDoc(doc(parent, 'parentSurveys/parent-2_student-1'), {
    parentUid: 'parent-2',
    studentUid: 'student-1',
    answers,
    consent: true,
    consentVersion: 'nexus-parent-survey-v1',
    submittedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(parent, 'parentSurveys/parent-1_student-1_invalid'), {
    parentUid: 'parent-1',
    studentUid: 'student-1',
    answers: { ...answers, q3: 3 },
    consent: true,
    consentVersion: 'nexus-parent-survey-v1',
    submittedAt: serverTimestamp(),
  }));

  await assertFails(setDoc(doc(student, 'grades/forged'), { studentUid: 'student-1', grade: 100 }));
  await assertFails(deleteDoc(doc(student, 'users/student-1')));
  console.log('Firestore rules security checks passed.');
} finally {
  await testEnv.cleanup();
}
