/**
 * Centralised, server-side configuration.
 *
 * All values are read from environment variables so the same image can be
 * promoted across dev / prod (see `apphosting.yaml` and `.env.example`).
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Set it locally in .env.local or in apphosting.yaml for Firebase App Hosting.`,
    );
  }
  return value;
}

export const config = {
  /** GCP project that owns Firestore + the media bucket. */
  get projectId(): string {
    return required(
      "GOOGLE_CLOUD_PROJECT",
      process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT,
    );
  },

  /**
   * Cloud Storage bucket that holds uploaded LMS media (videos, PDFs, ePubs,
   * posters, other materials). Defaults to the project's Firebase Storage
   * bucket so no extra provisioning is required.
   */
  get mediaBucket(): string {
    return (
      process.env.LMS_MEDIA_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      `${this.projectId}.firebasestorage.app`
    );
  },
} as const;
