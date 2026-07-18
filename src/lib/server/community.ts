import "server-only";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type {
  Attachment,
  ForumReply,
  ForumThread,
  ReplyInput,
  ThreadInput,
  ThreadWithReplies,
} from "@/lib/lms/types";

/**
 * Server-only data access (Admin SDK) for the community/forum. Threads are a
 * top-level collection with a nullable `courseId` so both general and
 * course-scoped questions live together:
 *
 *   lms_forum_threads/{threadId}
 *   lms_forum_threads/{threadId}/replies/{replyId}
 *
 * Author name/photo are denormalized at write time from the verified token.
 */
const THREADS = "lms_forum_threads";
const REPLIES = "replies";
const COURSES = "lms_courses";

const MAX_ATTACHMENTS = 6;

export interface Author {
  uid: string;
  name: string;
  photo: string | null;
}

function ms(ts: unknown): number | null {
  return ts instanceof Object && "toMillis" in ts ? (ts as Timestamp).toMillis() : null;
}

function threadsCol() {
  return adminDb.collection(THREADS);
}
function repliesCol(threadId: string) {
  return threadsCol().doc(threadId).collection(REPLIES);
}

/** Coerce untrusted attachment input into safe, bounded records. */
function sanitizeAttachments(input: unknown): Attachment[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, MAX_ATTACHMENTS)
    .map((a): Attachment | null => {
      if (!a || typeof a !== "object") return null;
      const rec = a as Record<string, unknown>;
      const url = typeof rec.url === "string" ? rec.url : "";
      if (!url.startsWith("http")) return null;
      return {
        url,
        contentType: typeof rec.contentType === "string" ? rec.contentType : "application/octet-stream",
        name: typeof rec.name === "string" ? rec.name.slice(0, 200) : "attachment",
        sizeBytes: typeof rec.sizeBytes === "number" ? rec.sizeBytes : 0,
      };
    })
    .filter((a): a is Attachment => a !== null);
}

function toThread(doc: FirebaseFirestore.DocumentSnapshot): ForumThread {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    courseId: typeof data.courseId === "string" ? data.courseId : null,
    courseTitle: typeof data.courseTitle === "string" ? data.courseTitle : null,
    sectionId: typeof data.sectionId === "string" ? data.sectionId : null,
    sectionTitle: typeof data.sectionTitle === "string" ? data.sectionTitle : null,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : null,
    chapterTitle: typeof data.chapterTitle === "string" ? data.chapterTitle : null,
    authorUid: data.authorUid ?? "",
    authorName: data.authorName ?? "Anonymous",
    authorPhoto: data.authorPhoto ?? null,
    title: data.title ?? "",
    body: data.body ?? "",
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    replyCount: typeof data.replyCount === "number" ? data.replyCount : 0,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
  };
}

function toReply(threadId: string, doc: FirebaseFirestore.DocumentSnapshot): ForumReply {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    threadId,
    authorUid: data.authorUid ?? "",
    authorName: data.authorName ?? "Anonymous",
    authorPhoto: data.authorPhoto ?? null,
    body: data.body ?? "",
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    createdAt: ms(data.createdAt),
  };
}

// ---------------- Threads ----------------

export type ThreadScope =
  | { kind: "all" }
  | { kind: "general" }
  | { kind: "course"; courseId: string };

/**
 * List threads for a scope, newest activity first. Equality filters + in-memory
 * sort avoid the need for composite Firestore indexes.
 */
export async function listThreads(scope: ThreadScope): Promise<ForumThread[]> {
  let threads: ForumThread[];
  if (scope.kind === "all") {
    const snap = await threadsCol().orderBy("updatedAt", "desc").limit(200).get();
    threads = snap.docs.map(toThread);
  } else {
    const value = scope.kind === "course" ? scope.courseId : null;
    const snap = await threadsCol().where("courseId", "==", value).get();
    threads = snap.docs.map(toThread);
    threads.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }
  return threads;
}

export async function getThreadWithReplies(threadId: string): Promise<ThreadWithReplies | null> {
  const doc = await threadsCol().doc(threadId).get();
  if (!doc.exists) return null;
  const snap = await repliesCol(threadId).orderBy("createdAt", "asc").get();
  return {
    thread: toThread(doc),
    replies: snap.docs.map((d) => toReply(threadId, d)),
  };
}

export async function createThread(author: Author, input: ThreadInput): Promise<ForumThread> {
  const now = FieldValue.serverTimestamp();

  let courseId: string | null = null;
  let courseTitle: string | null = null;
  let sectionId: string | null = null;
  let sectionTitle: string | null = null;
  let chapterId: string | null = null;
  let chapterTitle: string | null = null;

  if (input.courseId) {
    const courseRef = adminDb.collection(COURSES).doc(input.courseId);
    const course = await courseRef.get();
    if (course.exists) {
      courseId = input.courseId;
      courseTitle = (course.data()?.title as string) ?? null;

      // A chapter pins its own section, so resolve it first and derive the
      // section from it; fall back to an explicitly chosen section otherwise.
      if (input.chapterId) {
        const chapter = await courseRef.collection("chapters").doc(input.chapterId).get();
        if (chapter.exists) {
          chapterId = chapter.id;
          chapterTitle = (chapter.data()?.title as string) ?? null;
          const chSection = chapter.data()?.sectionId;
          if (typeof chSection === "string") sectionId = chSection;
        }
      }
      if (!sectionId && input.sectionId) sectionId = input.sectionId;

      if (sectionId) {
        const section = await courseRef.collection("sections").doc(sectionId).get();
        if (section.exists) sectionTitle = (section.data()?.title as string) ?? null;
        else sectionId = null; // stale/invalid section id
      }
    }
  }

  const ref = await threadsCol().add({
    courseId,
    courseTitle,
    sectionId,
    sectionTitle,
    chapterId,
    chapterTitle,
    authorUid: author.uid,
    authorName: author.name,
    authorPhoto: author.photo,
    title: (input.title ?? "").trim().slice(0, 200),
    body: (input.body ?? "").trim().slice(0, 5000),
    attachments: sanitizeAttachments(input.attachments),
    replyCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return toThread(created);
}

/** Delete a thread (and its replies). Only the author or an admin may call. */
export async function deleteThread(threadId: string): Promise<void> {
  const replies = await repliesCol(threadId).get();
  const batch = adminDb.batch();
  replies.forEach((r) => batch.delete(r.ref));
  batch.delete(threadsCol().doc(threadId));
  await batch.commit();
}

export async function getThreadAuthor(threadId: string): Promise<string | null> {
  const doc = await threadsCol().doc(threadId).get();
  return doc.exists ? ((doc.data()?.authorUid as string) ?? null) : null;
}

// ---------------- Replies ----------------

export async function addReply(
  threadId: string,
  author: Author,
  input: ReplyInput,
): Promise<ForumReply | null> {
  const threadRef = threadsCol().doc(threadId);
  if (!(await threadRef.get()).exists) return null;

  const now = FieldValue.serverTimestamp();
  const ref = await repliesCol(threadId).add({
    authorUid: author.uid,
    authorName: author.name,
    authorPhoto: author.photo,
    body: (input.body ?? "").trim().slice(0, 3000),
    attachments: sanitizeAttachments(input.attachments),
    createdAt: now,
  });
  // Bump activity + reply counter so the thread sorts to the top.
  await threadRef.update({ replyCount: FieldValue.increment(1), updatedAt: now });
  const created = await ref.get();
  return toReply(threadId, created);
}

export async function getReplyAuthor(threadId: string, replyId: string): Promise<string | null> {
  const doc = await repliesCol(threadId).doc(replyId).get();
  return doc.exists ? ((doc.data()?.authorUid as string) ?? null) : null;
}

export async function deleteReply(threadId: string, replyId: string): Promise<void> {
  await repliesCol(threadId).doc(replyId).delete();
  await threadsCol()
    .doc(threadId)
    .update({ replyCount: FieldValue.increment(-1) })
    .catch(() => {});
}
