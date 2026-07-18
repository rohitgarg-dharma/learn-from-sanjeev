import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { EMPTY_SITE_CONTENT, type SiteContent, type SiteContentKey } from "@/lib/lms/site-pages";

/**
 * Server-only access to the site's informational pages (Contact Us, Terms,
 * Disclaimer, Refund & Cancellation), stored as rich-text HTML in a single
 * non-secret Firestore doc `lms_config/content`.
 */
const CONFIG_COLLECTION = "lms_config";
const CONTENT_DOC = "content";
const MAX_LEN = 50_000;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const snap = await adminDb.collection(CONFIG_COLLECTION).doc(CONTENT_DOC).get();
    const d = snap.exists ? snap.data()! : {};
    return {
      siteTitle: str(d.siteTitle),
      contactUs: str(d.contactUs),
      terms: str(d.terms),
      disclaimer: str(d.disclaimer),
      refund: str(d.refund),
    };
  } catch (err) {
    console.warn("[site-content] could not read lms_config/content:", err);
    return { ...EMPTY_SITE_CONTENT };
  }
}

/** Merge-update the provided fields; returns the full, refreshed content. */
export async function setSiteContent(patch: Partial<SiteContent>): Promise<SiteContent> {
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (patch.siteTitle !== undefined) update.siteTitle = str(patch.siteTitle).slice(0, 200);
  const pageKeys: SiteContentKey[] = ["contactUs", "terms", "disclaimer", "refund"];
  for (const k of pageKeys) {
    if (patch[k] !== undefined) update[k] = str(patch[k]).slice(0, MAX_LEN);
  }
  await adminDb.collection(CONFIG_COLLECTION).doc(CONTENT_DOC).set(update, { merge: true });
  return getSiteContent();
}
