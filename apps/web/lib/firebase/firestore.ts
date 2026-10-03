import {
    collection,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    serverTimestamp
} from 'firebase/firestore'
import { db } from './config'
import { getCurrentUser } from './auth'

function requireDb() {
    if (!db) throw new Error('Firebase is not configured for Nexus.')
    return db
}

/**
 * Get user's grades
 */
export async function getGrades() {
    const firestore = requireDb()
    const user = getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const gradesRef = collection(firestore, 'grades')
    const q = query(gradesRef, where('userId', '==', user.uid))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }))
}

/**
 * Get user's assignments
 */
export async function getAssignments() {
    const firestore = requireDb()
    const user = getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const assignmentsRef = collection(firestore, 'assignments')
    const snapshot = await getDocs(assignmentsRef)

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }))
}

/**
 * Submit an assignment
 */
export async function submitAssignment(
    assignmentId: string,
    response: string,
    fileUrls: string[]
) {
    const firestore = requireDb()
    const user = getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const submissionData = {
        assignmentId,
        userId: user.uid,
        userEmail: user.email,
        response,
        attachments: fileUrls,
        submittedAt: serverTimestamp(),
        status: 'submitted'
    }

    const submissionsRef = collection(firestore, 'submissions')
    const docRef = await addDoc(submissionsRef, submissionData)

    return {
        id: docRef.id,
        ...submissionData
    }
}

/**
 * Get user's submissions
 */
export async function getMySubmissions() {
    const firestore = requireDb()
    const user = getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const submissionsRef = collection(firestore, 'submissions')
    const q = query(
        submissionsRef,
        where('userId', '==', user.uid),
        orderBy('submittedAt', 'desc')
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }))
}

/**
 * Get user's attendance
 */
export async function getAttendance() {
    const firestore = requireDb()
    const user = getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const attendanceRef = collection(firestore, 'attendance')
    const q = query(attendanceRef, where('userId', '==', user.uid))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }))
}
