import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { getCurrentUser } from './auth';

function requireFirestore() {
  if (!db) throw new Error('Firebase is not configured for Nexus.');
  return db;
}

function requireFirebaseUser() {
  const user = getCurrentUser();
  if (!user) throw new Error('سجّل الدخول مجددًا لإكمال هذه الخطوة.');
  return user;
}

export async function getStudentOnboardingProfile() {
  const firestore = requireFirestore();
  const user = requireFirebaseUser();
  const snapshot = await getDoc(doc(firestore, 'users', user.uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    gradeLevel: typeof data.gradeLevel === 'number' ? data.gradeLevel : null,
    dateOfBirth: typeof data.dateOfBirth === 'string' ? data.dateOfBirth : null,
  };
}

export async function syncStudentOnboardingMetadata(gradeLevel: number, dateOfBirth?: string) {
  const firestore = requireFirestore();
  const user = requireFirebaseUser();
  if (!Number.isInteger(gradeLevel) || gradeLevel < 0 || gradeLevel > 12) {
    throw new Error('الصف الدراسي غير صالح.');
  }

  await updateDoc(doc(firestore, 'users', user.uid), {
    gradeLevel,
    ...(dateOfBirth ? { dateOfBirth } : {}),
    updatedAt: serverTimestamp(),
  });
}
