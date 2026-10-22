import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Persistence,
  type Auth,
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

const firebaseApp = isFirebaseConfigured
  ? getApps().find((app) => app.name === 'nexus-mobile') ?? initializeApp(firebaseConfig, 'nexus-mobile')
  : null;

const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
}).getReactNativePersistence;

function createAuth(): Auth | null {
  if (!firebaseApp) return null;
  if (Platform.OS === 'web') return getAuth(firebaseApp);
  if (typeof getReactNativePersistence !== 'function') {
    throw new Error('Firebase React Native persistence is unavailable in this build.');
  }
  return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
}

export const firebaseAuth = createAuth();
export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;

export function firebaseConfigMissingMessage() {
  return 'إعداد Firebase للموبايل غير مكتمل. أضف قيم EXPO_PUBLIC_FIREBASE_* إلى بيئة تشغيل Expo.';
}
