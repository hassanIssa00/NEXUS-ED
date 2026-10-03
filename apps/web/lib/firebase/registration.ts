import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
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

function createLinkCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function saveStudentOnboarding(gradeLevel: number, dateOfBirth?: string) {
  const firestore = requireFirestore();
  const user = requireFirebaseUser();
  if (!Number.isInteger(gradeLevel) || gradeLevel < 0 || gradeLevel > 12) {
    throw new Error('الصف الدراسي غير صالح.');
  }

  await updateDoc(doc(firestore, 'users', user.uid), {
    gradeLevel,
    ...(dateOfBirth ? { dateOfBirth } : {}),
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  });

  const code = createLinkCode();
  await setDoc(doc(firestore, 'studentLinkCodes', code), {
    studentUid: user.uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  });
  return code;
}

export async function linkParentWithStudentCode(code: string) {
  const firestore = requireFirestore();
  const parent = requireFirebaseUser();
  const normalizedCode = code.trim().toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(normalizedCode)) throw new Error('رمز الربط غير صالح.');

  const codeRef = doc(firestore, 'studentLinkCodes', normalizedCode);
  const codeSnapshot = await getDoc(codeRef);
  if (!codeSnapshot.exists() || codeSnapshot.data().expiresAt.toMillis() <= Date.now()) {
    throw new Error('رمز الربط غير صالح أو انتهت صلاحيته.');
  }

  const studentUid = String(codeSnapshot.data().studentUid ?? '');
  if (!studentUid || studentUid === parent.uid) throw new Error('تعذر ربط الحساب بهذا الرمز.');

  const linkRef = doc(firestore, 'parentStudentLinks', `${parent.uid}_${studentUid}`);
  if ((await getDoc(linkRef)).exists()) throw new Error('هذا الطالب مرتبط بحسابك بالفعل.');

  const batch = writeBatch(firestore);
  batch.set(linkRef, {
    parentUid: parent.uid,
    studentUid,
    linkCode: normalizedCode,
    createdAt: serverTimestamp(),
  });
  batch.delete(codeRef);
  await batch.commit();
  return studentUid;
}

export async function saveParentSurvey(studentUid: string, answers: Record<string, string>, consent: boolean) {
  const firestore = requireFirestore();
  const parent = requireFirebaseUser();
  const questionIds = Array.from({ length: 15 }, (_, index) => `q${index + 1}`);
  if (!consent) throw new Error('يلزم تأكيد الموافقة قبل إرسال الاستبيان.');
  if (!questionIds.every((id) => typeof answers[id] === 'string' && answers[id].length > 0 && answers[id].length <= 100)) {
    throw new Error('أكمل إجابات الاستبيان قبل الإرسال.');
  }

  const parentProfile = await getDoc(doc(firestore, 'users', parent.uid));
  if (parentProfile.data()?.role !== 'parent') throw new Error('حساب ولي الأمر غير مهيأ.');
  const linkRef = doc(firestore, 'parentStudentLinks', `${parent.uid}_${studentUid}`);
  if (!(await getDoc(linkRef)).exists()) throw new Error('اربط الطالب بحسابك أولًا.');

  const surveyRef = doc(firestore, 'parentSurveys', `${parent.uid}_${studentUid}`);
  if ((await getDoc(surveyRef)).exists()) throw new Error('سبق إرسال استبيان لهذا الطالب.');
  await setDoc(surveyRef, {
    parentUid: parent.uid,
    studentUid,
    answers,
    consent: true,
    consentVersion: 'nexus-parent-survey-v1',
    submittedAt: serverTimestamp(),
  });
}
