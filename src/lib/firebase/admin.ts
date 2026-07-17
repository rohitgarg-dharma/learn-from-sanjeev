import { initializeApp, getApps, getApp, type App } from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { ADMIN_EMAIL_DOMAIN } from "@/lib/admin";

/**
 * Server-side Admin SDK. The app is fully server-mediated: the browser only
 * signs in (Google) and sends its ID token; every Firestore/Storage read/write
 * happens here via the Admin SDK, so the app needs no client Security Rules.
 * Uses Application Default Credentials (App Hosting service account in prod,
 * `gcloud auth application-default login` locally) — no key files committed.
 */
const app: App = getApps().length ? getApp() : initializeApp();

export const adminAuth: Auth = getAuth(app);

/** Server-side Firestore — the single gate for all app data. */
export const adminDb: Firestore = getFirestore(app);

/** Server-side Cloud Storage — the single gate for all media uploads. */
export const adminStorage: Storage = getStorage(app);

/**
 * Verify a Firebase ID token from an `Authorization: Bearer` header. Returns the
 * decoded token (with uid/email) or null when missing/invalid.
 */
export async function verifyBearer(authHeader: string | null): Promise<DecodedIdToken | null> {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

/** An admin is a verified ritvijam.com Google account. */
export function isAdminToken(decoded: DecodedIdToken | null): boolean {
  return (
    !!decoded &&
    decoded.email_verified === true &&
    typeof decoded.email === "string" &&
    decoded.email.toLowerCase().endsWith(`@${ADMIN_EMAIL_DOMAIN}`)
  );
}
