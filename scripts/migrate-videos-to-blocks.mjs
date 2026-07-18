#!/usr/bin/env node
/**
 * One-time migration: fold each chapter's legacy `videos[]` bucket into the
 * chapter content blocks, then empty the bucket. This backs the removal of the
 * standalone "Videos" section in the chapter editor now that a Video block
 * exists in the flexible content builder.
 *
 * For every chapter with a non-empty `videos[]`:
 *   - each VideoItem becomes a leading `video` block (preserving storagePath)
 *   - a non-empty `notes` HTML becomes a following `richtext` block
 *   - `videos` is reset to []
 *
 * Idempotent: chapters with no `videos[]` are skipped, so re-running is safe.
 *
 * Usage:
 *   node scripts/migrate-videos-to-blocks.mjs [--key <serviceAccount.json>] [--dry]
 *
 * Firestore uses gRPC — if you're behind a proxy, export grpc_proxy first, e.g.
 *   grpc_proxy=http://localhost:10054 node scripts/migrate-videos-to-blocks.mjs
 *
 * Credentials (first match wins):
 *   --key <path>  ·  $GOOGLE_APPLICATION_CREDENTIALS  ·  Application Default
 */
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COURSES = "lms_courses";
const CHAPTERS = "chapters";

function parseArgs(argv) {
  const out = { _: [], dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--key") out.key = argv[++i];
    else if (a === "--dry") out.dry = true;
    else out._.push(a);
  }
  return out;
}

function videoToBlocks(v) {
  const blocks = [];
  const block = {
    id: typeof v.id === "string" && v.id ? v.id : randomUUID(),
    type: "video",
    title: typeof v.title === "string" ? v.title : "",
    url: v.storagePath ? "" : typeof v.url === "string" ? v.url : "",
    provider: v.provider === "youtube" || v.provider === "vimeo" ? v.provider : "file",
  };
  if (typeof v.storagePath === "string" && v.storagePath) block.storagePath = v.storagePath;
  blocks.push(block);

  if (typeof v.notes === "string" && v.notes.trim()) {
    blocks.push({ id: randomUUID(), type: "richtext", html: v.notes });
  }
  return blocks;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
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

  initializeApp({ credential, projectId });
  const db = getFirestore();

  const courses = await db.collection(COURSES).get();
  console.log(`Scanning ${courses.size} course(s)…${args.dry ? " (dry run)" : ""}`);

  let migratedChapters = 0;
  let migratedVideos = 0;

  for (const course of courses.docs) {
    const chapters = await course.ref.collection(CHAPTERS).get();
    for (const chapter of chapters.docs) {
      const data = chapter.data();
      const videos = Array.isArray(data.videos) ? data.videos : [];
      if (videos.length === 0) continue;

      const existingBlocks = Array.isArray(data.blocks) ? data.blocks : [];
      const videoBlocks = videos.flatMap(videoToBlocks);
      const nextBlocks = [...videoBlocks, ...existingBlocks];

      console.log(
        `  ${course.id}/${chapter.id} "${data.title ?? ""}": ` +
          `${videos.length} video(s) → ${videoBlocks.length} block(s) ` +
          `(chapter now has ${nextBlocks.length} block(s))`,
      );

      migratedChapters += 1;
      migratedVideos += videos.length;

      if (!args.dry) {
        await chapter.ref.update({ blocks: nextBlocks, videos: [] });
      }
    }
  }

  console.log(
    `\nDone. ${args.dry ? "Would migrate" : "Migrated"} ${migratedVideos} video(s) ` +
      `across ${migratedChapters} chapter(s).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
