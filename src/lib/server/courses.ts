import "server-only";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  EMPTY_BUCKETS,
  type Chapter,
  type ChapterInput,
  type Course,
  type CourseInput,
  type CourseWithChapters,
} from "@/lib/lms/types";

/**
 * Server-only data access (Admin SDK) for the LMS. All course/chapter reads and
 * writes go through here — the browser never touches Firestore. Collections are
 * namespaced with the `lms_` prefix in the shared dharma-501312 database.
 *
 *   lms_courses/{courseId}
 *   lms_courses/{courseId}/chapters/{chapterId}
 */
const COURSES = "lms_courses";
const CHAPTERS = "chapters";

function ms(ts: unknown): number | null {
  return ts instanceof Object && "toMillis" in ts ? (ts as Timestamp).toMillis() : null;
}

function coursesCol() {
  return adminDb.collection(COURSES);
}
function chaptersCol(courseId: string) {
  return coursesCol().doc(courseId).collection(CHAPTERS);
}

// ---------------- shaping helpers ----------------

/** Normalizes an arbitrary Firestore doc into the four content buckets. */
function buckets(data: FirebaseFirestore.DocumentData) {
  return {
    videos: Array.isArray(data.videos) ? data.videos : [],
    books: Array.isArray(data.books) ? data.books : [],
    posters: Array.isArray(data.posters) ? data.posters : [],
    materials: Array.isArray(data.materials) ? data.materials : [],
  };
}

function toCourse(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Course {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    title: data.title ?? "",
    description: data.description ?? "",
    coverImageUrl: data.coverImageUrl ?? undefined,
    category: data.category ?? undefined,
    isPublished: data.isPublished === true,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
    ...buckets(data),
  };
}

function toChapter(courseId: string, doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Chapter {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    courseId,
    title: data.title ?? "",
    description: data.description ?? undefined,
    isPublished: data.isPublished === true,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
    ...buckets(data),
  };
}

/** Only copy through fields that were actually provided (partial update). */
function pickBuckets<T extends CourseInput | ChapterInput>(input: T) {
  const out: FirebaseFirestore.DocumentData = {};
  if (input.videos !== undefined) out.videos = input.videos;
  if (input.books !== undefined) out.books = input.books;
  if (input.posters !== undefined) out.posters = input.posters;
  if (input.materials !== undefined) out.materials = input.materials;
  return out;
}

// ---------------- Courses ----------------

/** List courses. Admins see all; learners see only published ones. */
export async function listCourses(includeUnpublished: boolean): Promise<Course[]> {
  const snap = await coursesCol().orderBy("sortOrder", "asc").get();
  const courses = snap.docs.map(toCourse);
  return includeUnpublished ? courses : courses.filter((c) => c.isPublished);
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const doc = await coursesCol().doc(courseId).get();
  return doc.exists ? toCourse(doc) : null;
}

/** Course plus its chapters (published-only for learners). */
export async function getCourseWithChapters(
  courseId: string,
  includeUnpublished: boolean,
): Promise<CourseWithChapters | null> {
  const course = await getCourse(courseId);
  if (!course) return null;
  if (!course.isPublished && !includeUnpublished) return null;
  const chapters = await listChapters(courseId, includeUnpublished);
  return { course, chapters };
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const now = FieldValue.serverTimestamp();
  const ref = await coursesCol().add({
    title: (input.title ?? "Untitled course").slice(0, 200),
    description: input.description ?? "",
    coverImageUrl: input.coverImageUrl ?? null,
    category: input.category ?? null,
    isPublished: input.isPublished === true,
    sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : Date.now(),
    ...EMPTY_BUCKETS,
    ...pickBuckets(input),
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return toCourse(created);
}

export async function updateCourse(courseId: string, input: CourseInput): Promise<Course | null> {
  const ref = coursesCol().doc(courseId);
  if (!(await ref.get()).exists) return null;
  const patch: FirebaseFirestore.DocumentData = { updatedAt: FieldValue.serverTimestamp() };
  if (input.title !== undefined) patch.title = input.title.slice(0, 200);
  if (input.description !== undefined) patch.description = input.description;
  if (input.coverImageUrl !== undefined) patch.coverImageUrl = input.coverImageUrl || null;
  if (input.category !== undefined) patch.category = input.category || null;
  if (input.isPublished !== undefined) patch.isPublished = input.isPublished === true;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  Object.assign(patch, pickBuckets(input));
  await ref.update(patch);
  return getCourse(courseId);
}

export async function deleteCourse(courseId: string): Promise<void> {
  const chapters = await chaptersCol(courseId).get();
  const batch = adminDb.batch();
  chapters.forEach((c) => batch.delete(c.ref));
  batch.delete(coursesCol().doc(courseId));
  await batch.commit();
}

// ---------------- Chapters ----------------

export async function listChapters(courseId: string, includeUnpublished: boolean): Promise<Chapter[]> {
  const snap = await chaptersCol(courseId).orderBy("sortOrder", "asc").get();
  const chapters = snap.docs.map((d) => toChapter(courseId, d));
  return includeUnpublished ? chapters : chapters.filter((c) => c.isPublished);
}

export async function getChapter(courseId: string, chapterId: string): Promise<Chapter | null> {
  const doc = await chaptersCol(courseId).doc(chapterId).get();
  return doc.exists ? toChapter(courseId, doc) : null;
}

export async function createChapter(courseId: string, input: ChapterInput): Promise<Chapter | null> {
  if (!(await coursesCol().doc(courseId).get()).exists) return null;
  const now = FieldValue.serverTimestamp();
  const ref = await chaptersCol(courseId).add({
    title: (input.title ?? "Untitled chapter").slice(0, 200),
    description: input.description ?? null,
    isPublished: input.isPublished === true,
    sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : Date.now(),
    ...EMPTY_BUCKETS,
    ...pickBuckets(input),
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return toChapter(courseId, created);
}

export async function updateChapter(
  courseId: string,
  chapterId: string,
  input: ChapterInput,
): Promise<Chapter | null> {
  const ref = chaptersCol(courseId).doc(chapterId);
  if (!(await ref.get()).exists) return null;
  const patch: FirebaseFirestore.DocumentData = { updatedAt: FieldValue.serverTimestamp() };
  if (input.title !== undefined) patch.title = input.title.slice(0, 200);
  if (input.description !== undefined) patch.description = input.description || null;
  if (input.isPublished !== undefined) patch.isPublished = input.isPublished === true;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  Object.assign(patch, pickBuckets(input));
  await ref.update(patch);
  return getChapter(courseId, chapterId);
}

export async function deleteChapter(courseId: string, chapterId: string): Promise<void> {
  await chaptersCol(courseId).doc(chapterId).delete();
}
