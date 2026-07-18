import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Per-learner course progress (Admin SDK). We track which chapters a user has
 * completed, one document per (user, course):
 *
 *   lms_progress/{uid}__{courseId}  ->  { uid, courseId, completedChapterIds[] }
 */
const PROGRESS = "lms_progress";

function docId(uid: string, courseId: string): string {
  return `${uid}__${courseId}`;
}

function progressCol() {
  return adminDb.collection(PROGRESS);
}

/** The chapter ids this user has marked complete for the course. */
export async function getCompletedChapters(uid: string, courseId: string): Promise<string[]> {
  const snap = await progressCol().doc(docId(uid, courseId)).get();
  const ids = snap.data()?.completedChapterIds;
  return Array.isArray(ids) ? ids.filter((v) => typeof v === "string") : [];
}

/** Add or remove a chapter from the user's completed set; returns the new set. */
export async function setChapterCompleted(
  uid: string,
  courseId: string,
  chapterId: string,
  completed: boolean,
): Promise<string[]> {
  await progressCol()
    .doc(docId(uid, courseId))
    .set(
      {
        uid,
        courseId,
        completedChapterIds: completed
          ? FieldValue.arrayUnion(chapterId)
          : FieldValue.arrayRemove(chapterId),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return getCompletedChapters(uid, courseId);
}
