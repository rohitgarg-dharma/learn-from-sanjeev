#!/usr/bin/env node
/**
 * Sync a local media file (typically a large video that exceeds the in-app
 * 200 MB upload limit) into the LMS Cloud Storage bucket, and print the storage
 * path to paste into the course editor ("Add by path").
 *
 * Objects are content-addressed by SHA-256 (matching the in-app uploader), so
 * re-running on identical bytes is a no-op.
 *
 * Usage:
 *   node scripts/sync-media.mjs <file> [--key <serviceAccount.json>] \
 *                                       [--bucket <name>] [--prefix lms-media]
 *
 * Credentials (first match wins):
 *   --key <path>  ·  $GOOGLE_APPLICATION_CREDENTIALS  ·  Application Default
 *
 * Bucket (first match wins):
 *   --bucket <name>  ·  $LMS_MEDIA_BUCKET  ·  <projectId>.firebasestorage.app
 */
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, basename } from "node:path";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const CONTENT_TYPES = {
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
};

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--key" || a === "--bucket" || a === "--prefix") out[a.slice(2)] = argv[++i];
    else out._.push(a);
  }
  return out;
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("error", reject)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file || !existsSync(file)) {
    console.error("Error: pass a path to an existing file.\n");
    console.error("  node scripts/sync-media.mjs <file> [--key sa.json] [--bucket name]");
    process.exit(1);
  }

  const keyPath = args.key ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT;
  let credential;
  if (keyPath) {
    if (!existsSync(keyPath)) {
      console.error(`Error: service account key not found: ${keyPath}`);
      process.exit(1);
    }
    const key = JSON.parse(readFileSync(keyPath, "utf8"));
    projectId = projectId ?? key.project_id;
    credential = cert(key);
  } else {
    credential = applicationDefault();
  }

  const bucketName =
    args.bucket ?? process.env.LMS_MEDIA_BUCKET ?? (projectId && `${projectId}.firebasestorage.app`);
  if (!bucketName) {
    console.error("Error: could not resolve a bucket. Pass --bucket or set LMS_MEDIA_BUCKET.");
    process.exit(1);
  }

  initializeApp({ credential, projectId, storageBucket: bucketName });
  const bucket = getStorage().bucket(bucketName);

  const prefix = (args.prefix ?? "lms-media").replace(/\/+$/, "");
  const ext = extname(file).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const sizeMb = (statSync(file).size / (1024 * 1024)).toFixed(1);

  console.log(`Hashing ${basename(file)} (${sizeMb} MB)…`);
  const checksum = await sha256(file);
  const objectPath = `${prefix}/${checksum}${ext}`;
  const object = bucket.file(objectPath);

  const [exists] = await object.exists();
  if (exists) {
    console.log(`Already in gs://${bucketName}/${objectPath} — skipping upload.`);
  } else {
    console.log(`Uploading to gs://${bucketName}/${objectPath} …`);
    await bucket.upload(file, {
      destination: objectPath,
      resumable: true,
      metadata: { contentType, metadata: { originalFilename: basename(file), checksum } },
    });
    console.log("Upload complete.");
  }

  let signed = "(signing skipped)";
  try {
    [signed] = await object.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
  } catch (err) {
    signed = `(could not sign: ${err.message})`;
  }

  console.log("\n──────────────────────────────────────────────");
  console.log("Storage path (paste into editor → Add by path):");
  console.log(`  ${objectPath}`);
  console.log("\nSample signed URL (valid ~1h, sanity check only):");
  console.log(`  ${signed}`);
  console.log("──────────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
