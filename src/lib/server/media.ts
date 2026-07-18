import "server-only";
import { createHash, randomUUID } from "crypto";
import { basename, extname } from "path";
import { adminStorage } from "@/lib/firebase/admin";
import { getAppConfig } from "@/lib/server/app-config";
import type { ChapterBlock, MediaUploadResponse, VideoItem } from "@/lib/lms/types";

/**
 * Server-only media handling (Admin SDK). The browser posts a file to the admin
 * upload route, which streams it here. Objects keep their original (sanitized)
 * filename; re-uploading identical bytes reuses the same object, and a name
 * already taken by different content gets a short checksum suffix.
 *
 * Access: objects are served via a Firebase Storage download URL carrying an
 * unguessable token (works with uniform bucket-level access, no signing SA
 * needed), so <img>/<video>/<iframe> can load them directly in the browser.
 */
const MEDIA_PREFIX = "lms-media";
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

/** Turn a filename into a safe, readable object base + extension. */
function sanitizeFilename(filename: string): { base: string; ext: string } {
  const ext = extname(filename).toLowerCase().slice(0, 12);
  const base =
    basename(filename, extname(filename))
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 80) || "file";
  return { base, ext };
}

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
  const mediaBucket = await bucket();
  // Keep the original, human-readable filename; only fall back to a short
  // checksum suffix if a *different* file already claims that name.
  const { base, ext } = sanitizeFilename(originalFilename);
  const primaryPath = `${MEDIA_PREFIX}/${base}${ext}`;
  const primary = mediaBucket.file(primaryPath);
  const [primaryExists] = await primary.exists();

  let objectPath = primaryPath;
  if (primaryExists) {
    const [meta] = await primary.getMetadata();
    if (meta.metadata?.checksum === checksum) {
      // Identical bytes already uploaded under this name — reuse it.
      const existingToken = meta.metadata?.firebaseStorageDownloadTokens as string | undefined;
      const token = existingToken ?? randomUUID();
      if (!existingToken) {
        await primary.setMetadata({
          metadata: { ...meta.metadata, firebaseStorageDownloadTokens: token },
        });
      }
      return {
        url: downloadUrl(mediaBucket.name, primaryPath, token),
        storagePath: primaryPath,
        contentType: type,
        sizeBytes: buffer.length,
        originalFilename,
      };
    }
    // Same name, different content — disambiguate with a short checksum suffix.
    objectPath = `${MEDIA_PREFIX}/${base}-${checksum.slice(0, 8)}${ext}`;
  }

  const file = mediaBucket.file(objectPath);
  const [exists] = await file.exists();
  if (exists) {
    const [meta] = await file.getMetadata();
    const existingToken = meta.metadata?.firebaseStorageDownloadTokens as string | undefined;
    const token = existingToken ?? randomUUID();
    if (!existingToken) {
      await file.setMetadata({
        metadata: { ...meta.metadata, firebaseStorageDownloadTokens: token },
      });
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

export interface DirectUpload {
  /** Resumable session URL the browser PUTs the file bytes to (bypasses us). */
  uploadUrl: string;
  /** Final object path in the media bucket. */
  storagePath: string;
  /** Durable, browser-loadable download URL (token) for the object. */
  url: string;
  contentType: string;
}

/**
 * Starts a resumable upload session so the browser can stream a file (including
 * multi-GB video/audio) **directly** to Cloud Storage — the bytes never pass
 * through our API route, sidestepping App Hosting's request-body/memory limits.
 *
 * We can't content-dedupe here (we never see the bytes), so a name already taken
 * gets a short random suffix rather than clobbering the existing object. The
 * download token is baked into the object metadata up front, so the returned
 * `url` is valid the moment the upload finalizes — no extra round trip.
 *
 * `origin` must be the browser's origin so GCS allows the cross-origin PUT
 * (bucket CORS must also permit it).
 */
export async function createDirectUpload(
  originalFilename: string,
  contentType: string,
  origin: string,
): Promise<DirectUpload> {
  const type = contentType || "application/octet-stream";
  if (!isAllowed(type)) throw new MediaError(`Unsupported file type: ${type}`);

  const mediaBucket = await bucket();
  const { base, ext } = sanitizeFilename(originalFilename);
  let objectPath = `${MEDIA_PREFIX}/${base}${ext}`;
  const [taken] = await mediaBucket.file(objectPath).exists();
  if (taken) objectPath = `${MEDIA_PREFIX}/${base}-${randomUUID().slice(0, 8)}${ext}`;

  const token = randomUUID();
  const file = mediaBucket.file(objectPath);
  const [uploadUrl] = await file.createResumableUpload({
    origin,
    metadata: {
      contentType: type,
      metadata: { originalFilename, firebaseStorageDownloadTokens: token },
    },
  });

  return {
    uploadUrl,
    storagePath: objectPath,
    url: downloadUrl(mediaBucket.name, objectPath, token),
    contentType: type,
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

/**
 * Signs the `url` of any bucket-hosted chapter block (video/audio/image/file
 * with a `storagePath`). Rich-text and external blocks pass through untouched.
 */
export async function signChapterBlocks(blocks: ChapterBlock[]): Promise<ChapterBlock[]> {
  if (!Array.isArray(blocks) || blocks.length === 0) return blocks ?? [];
  return Promise.all(
    blocks.map(async (b) => {
      const path = "storagePath" in b ? b.storagePath : undefined;
      if (!path) return b;
      try {
        return { ...b, url: await signedReadUrl(path) };
      } catch (err) {
        console.warn(`[media] could not sign block ${path}:`, err);
        return b;
      }
    }),
  );
}
