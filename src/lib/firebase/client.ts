import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import {
  getAnalytics,
  isSupported,
  type Analytics,
} from "firebase/analytics";

/**
 * Public Firebase web config. The browser uses Firebase ONLY for Google sign-in
 * (and analytics) — every Firestore/Storage read/write is server-mediated through
 * the app's API routes (Admin SDK), so there is no client Firestore/Storage SDK.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Lazy singletons so importing this module has no side effects on the server
// (during prerender there is no API key, and getAuth() would throw). The SDK is
// only initialized on first use, which always happens in the browser.
let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let analyticsInstance: Analytics | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

/**
 * Initializes Firebase Analytics, but only in the browser and only where the
 * environment supports it (getAnalytics throws during SSR/prerender). Returns
 * null when Analytics is unavailable so callers can no-op safely.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (analyticsInstance) return analyticsInstance;
  if (!(await isSupported())) return null;
  analyticsInstance = getAnalytics(getFirebaseApp());
  return analyticsInstance;
}

export const googleProvider = new GoogleAuthProvider();
