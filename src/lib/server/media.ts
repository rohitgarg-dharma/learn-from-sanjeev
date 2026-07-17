import "server-only";
import { createHash, randomUUID } from "crypto";
import { extname } from "path";
import { adminStorage } from "@/lib/firebase/admin";
import { getAppConfig } from "@/lib/server/app-config";
import type { MediaUploadResponse, VideoItem } from "@/lib/lms/types";

/**
 * Server-only media handling (Admin SDK). The browser posts a file to the admin
 * upload route, which streams it here. Files are content-addressed by SHA256 so
 * re-uploading identical bytes de-dupes to the same object.
 *
 * Access: objects are served via a Firebase Storage download URL carrying an
 * unguessable token (works with uniform bucket-level access, no signing SA
 * needed), so <img>/<video>/<iframe> can load them directly in the browser.
 */
const MEDIA_PREFIX = "lms-media";
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_EXACT = new Set([
  "application/pdf",
  "application/epub+zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
]);

function isAllowed(contentType: string): boolean {
  return (
    ALLOWED_EXACT.has(contentType) ||
    ALLOWED_PREFIXES.some((p) => contentType.startsWith(p))
  );
}

async function bucket() {
  const { mediaBucket } = await getAppConfig();
  return adminStorage.bucket(mediaBucket);
}

function downloadUrl(bucketName: string, objectPath: string, token: string): string {
  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/` +
    `${encodeURIComponent(objectPath)}?alt=media&token=${token}`
  );
}

export class MediaError extends Error {}

/**
 * Uploads a file to Cloud Storage and returns a browser-loadable URL. Throws
 * `MediaError` on validation failure (caller maps to a 400).
 */
export async function uploadMedia(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
): Promise<MediaUploadResponse> {
  if (!buffer.length) throw new MediaError("Empty file.");
  if (buffer.length > MAX_BYTES) throw new MediaError("File exceeds the 200 MB limit.");
  const type = contentType || "application/octet-stream";
  if (!isAllowed(type)) throw new MediaError(`Unsupported file type: ${type}`);

  const checksum = createHash("sha256").update(buffer).digest("hex");
  const ext = extname(originalFilename).toLowerCase().slice(0, 12);
  const objectPath = `${MEDIA_PREFIX}/${checksum}${ext}`;
  const mediaBucket = await bucket();
  const file = mediaBucket.file(objectPath);

  const [exists] = await file.exists();
  if (exists) {
    // Reuse the existing object (and its token) — content-addressed de-dupe.
    const [meta] = await file.getMetadata();
    const existingToken = meta.metadata?.firebaseStorageDownloadTokens as string | undefined;
    const token = existingToken ?? randomUUID();
    if (!existingToken) {
      await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
    }
    return {
      url: downloadUrl(mediaBucket.name, objectPath, token),
      storagePath: objectPath,
      contentType: type,
      sizeBytes: buffer.length,
      originalFilename,
    };
  }

  const token = randomUUID();
  await file.save(buffer, {
    resumable: false,
    contentType: type,
    metadata: {
      contentType: type,
      metadata: {
        firebaseStorageDownloadTokens: token,
        originalFilename,
        checksum,
      },
    },
  });

  return {
    url: downloadUrl(mediaBucket.name, objectPath, token),
    storagePath: objectPath,
    contentType: type,
    sizeBytes: buffer.length,
    originalFilename,
  };
}

/** How long a learner's signed video URL stays valid. */
const SIGNED_URL_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Mints a short-lived V4 signed read URL for an object in the media bucket.
 * Works with a service-account private key (local dev) and, in production
 * (App Hosting), with the runtime service account via the IAM `signBlob` API —
 * that SA needs the `Service Account Token Creator` role on itself.
 */
export async function signedReadUrl(
  objectPath: string,
  ttlMs: number = SIGNED_URL_TTL_MS,
): Promise<string> {
  const mediaBucket = await bucket();
  const [url] = await mediaBucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + ttlMs,
  });
  return url;
}

/**
 * Replaces the `url` of every bucket-hosted ("file" videos with a `storagePath`)
 * video with a fresh signed URL. External embeds (YouTube/Vimeo) and plain URL
 * videos pass through untouched. Signing failures fall back to the stored url so
 * a transient IAM/permission issue never blanks the player.
 */
export async function signVideoItems(videos: VideoItem[]): Promise<VideoItem[]> {
  if (!Array.isArray(videos) || videos.length === 0) return videos ?? [];
  return Promise.all(
    videos.map(async (v) => {
      if (!v?.storagePath) return v;
      try {
        return { ...v, url: await signedReadUrl(v.storagePath) };
      } catch (err) {
        console.warn(`[media] could not sign ${v.storagePath}:`, err);
        return v;
      }
    }),
  );
}
