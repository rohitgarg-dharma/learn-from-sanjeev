import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { config } from "@/lib/config";

/**
 * Runtime app configuration, stored in Firestore (no secrets) at
 * `lms_config/app`. This keeps non-secret settings (media bucket, feature
 * flags) editable without a redeploy. Values fall back to env/defaults so a
 * missing/unreadable doc never breaks the app. Cached in-process to avoid a
 * Firestore read on every request.
 */
const CONFIG_COLLECTION = "lms_config";
const APP_DOC = "app";

export interface AppConfig {
  mediaBucket: string;
  communityEnabled: boolean;
}

let cached: { value: AppConfig; at: number } | null = null;
const TTL_MS = 60_000;

export async function getAppConfig(): Promise<AppConfig> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const fallback: AppConfig = { mediaBucket: config.mediaBucket, communityEnabled: true };
  try {
    const snap = await adminDb.collection(CONFIG_COLLECTION).doc(APP_DOC).get();
    const data = snap.exists ? snap.data()! : {};
    const value: AppConfig = {
      mediaBucket: typeof data.mediaBucket === "string" ? data.mediaBucket : fallback.mediaBucket,
      communityEnabled: data.communityEnabled !== false,
    };
    cached = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.warn("[app-config] could not read lms_config/app, using defaults:", err);
    return fallback;
  }
}
