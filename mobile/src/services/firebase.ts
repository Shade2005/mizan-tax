// ============================================================================
// Mizan (ميزان) - Firebase Client SDK Configuration
// Provides persistent Authentication for React Native / Expo
// ============================================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
// @ts-ignore - getReactNativePersistence is resolved in react-native runtime from @firebase/auth/dist/rn
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyDECSXEHf_IjUu62mhYkyvBMSQ0rAtiQWI',
  authDomain: 'mizan-tax.firebaseapp.com',
  projectId: 'mizan-tax',
  storageBucket: 'mizan-tax.firebasestorage.app',
  messagingSenderId: '665284372832',
  appId: '1:665284372832:web:9f1e166a033078bd6c9605',
};

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence for React Native
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export {
  app,
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  updateProfile,
};
