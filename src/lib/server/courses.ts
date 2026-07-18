import "server-only";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  EMPTY_BUCKETS,
  type AdminStats,
  type Chapter,
  type ChapterInput,
  type Course,
  type CourseInput,
  type CourseWithChapters,
  type Section,
  type SectionInput,
  type VideoItem,
} from "@/lib/lms/types";

/**
 * Server-only data access (Admin SDK) for the LMS. All course/section/chapter
 * reads and writes go through here — the browser never touches Firestore.
 * Collections are namespaced with the `lms_` prefix in the shared dharma-501312
 * database.
 *
 *   lms_courses/{courseId}
 *   lms_courses/{courseId}/sections/{sectionId}
 *   lms_courses/{courseId}/chapters/{chapterId}   (chapter.sectionId groups it)
 */
const COURSES = "lms_courses";
const SECTIONS = "sections";
const CHAPTERS = "chapters";

function ms(ts: unknown): number | null {
  return ts instanceof Object && "toMillis" in ts ? (ts as Timestamp).toMillis() : null;
}

function coursesCol() {
  return adminDb.collection(COURSES);
}
function sectionsCol(courseId: string) {
  return coursesCol().doc(courseId).collection(SECTIONS);
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
    level: data.level ?? undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    promoVideoUrl: data.promoVideoUrl ?? undefined,
    aboutContent: data.aboutContent ?? undefined,
    isPublished: data.isPublished === true,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
    ...buckets(data),
  };
}

/** Normalize tags to trimmed, lowercased, de-duped strings. */
function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const v = t.trim().toLowerCase();
    if (v) seen.add(v);
  }
  return [...seen].slice(0, 30);
}

function toSection(courseId: string, doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Section {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    courseId,
    title: data.title ?? "",
    description: data.description ?? undefined,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
  };
}

function toChapter(courseId: string, doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Chapter {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    courseId,
    sectionId: typeof data.sectionId === "string" ? data.sectionId : null,
    title: data.title ?? "",
    description: data.description ?? undefined,
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
    isPublished: data.isPublished === true,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
    ...buckets(data),
  };
}

/**
 * For bucket-hosted videos (`storagePath` set) the `url` is a transient signed
 * URL minted per request, so we never persist it — store an empty string and
 * force provider "file". External / plain-URL videos are left untouched.
 */
function normalizeVideosForStorage(videos: unknown): unknown {
  if (!Array.isArray(videos)) return videos;
  return videos.map((v) =>
    v && typeof v === "object" && typeof (v as VideoItem).storagePath === "string"
      ? { ...(v as VideoItem), provider: "file", url: "" }
      : v,
  );
}

/**
 * Chapter content blocks: for bucket-hosted blocks (`storagePath` set) the
 * `url` is a transient signed URL minted per request, so we blank it before
 * persisting — the signed URL is regenerated on read.
 */
function normalizeBlocksForStorage(blocks: unknown): FirebaseFirestore.DocumentData[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) =>
    b && typeof b === "object" && typeof (b as { storagePath?: unknown }).storagePath === "string"
      ? { ...(b as object), url: "" }
      : (b as object),
  );
}

/** Only copy through fields that were actually provided (partial update). */
function pickBuckets<T extends CourseInput | ChapterInput>(input: T) {
  const out: FirebaseFirestore.DocumentData = {};
  if (input.videos !== undefined) out.videos = normalizeVideosForStorage(input.videos);
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

/** Course plus its sections + chapters (published-only for learners). */
export async function getCourseWithChapters(
  courseId: string,
  includeUnpublished: boolean,
): Promise<CourseWithChapters | null> {
  const course = await getCourse(courseId);
  if (!course) return null;
  if (!course.isPublished && !includeUnpublished) return null;
  const [sections, chapters] = await Promise.all([
    listSections(courseId),
    listChapters(courseId, includeUnpublished),
  ]);
  return { course, sections, chapters };
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const now = FieldValue.serverTimestamp();
  const ref = await coursesCol().add({
    title: (input.title ?? "Untitled course").slice(0, 200),
    description: input.description ?? "",
    coverImageUrl: input.coverImageUrl ?? null,
    category: input.category ?? null,
    level: input.level ?? null,
    tags: normalizeTags(input.tags),
    promoVideoUrl: input.promoVideoUrl ?? null,
    aboutContent: input.aboutContent ?? null,
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
  if (input.level !== undefined) patch.level = input.level || null;
  if (input.tags !== undefined) patch.tags = normalizeTags(input.tags);
  if (input.promoVideoUrl !== undefined) patch.promoVideoUrl = input.promoVideoUrl || null;
  if (input.aboutContent !== undefined) patch.aboutContent = input.aboutContent || null;
  if (input.isPublished !== undefined) patch.isPublished = input.isPublished === true;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  Object.assign(patch, pickBuckets(input));
  await ref.update(patch);
  return getCourse(courseId);
}

export async function deleteCourse(courseId: string): Promise<void> {
  const [chapters, sections] = await Promise.all([
    chaptersCol(courseId).get(),
    sectionsCol(courseId).get(),
  ]);
  const batch = adminDb.batch();
  chapters.forEach((c) => batch.delete(c.ref));
  sections.forEach((s) => batch.delete(s.ref));
  batch.delete(coursesCol().doc(courseId));
  await batch.commit();
}

// ---------------- Sections ----------------

export async function listSections(courseId: string): Promise<Section[]> {
  const snap = await sectionsCol(courseId).orderBy("sortOrder", "asc").get();
  return snap.docs.map((d) => toSection(courseId, d));
}

export async function createSection(courseId: string, input: SectionInput): Promise<Section | null> {
  if (!(await coursesCol().doc(courseId).get()).exists) return null;
  const now = FieldValue.serverTimestamp();
  const ref = await sectionsCol(courseId).add({
    title: (input.title ?? "Untitled section").slice(0, 200),
    description: input.description ?? null,
    sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : Date.now(),
    createdAt: now,
    updatedAt: now,
  });
  return toSection(courseId, await ref.get());
}

export async function updateSection(
  courseId: string,
  sectionId: string,
  input: SectionInput,
): Promise<Section | null> {
  const ref = sectionsCol(courseId).doc(sectionId);
  if (!(await ref.get()).exists) return null;
  const patch: FirebaseFirestore.DocumentData = { updatedAt: FieldValue.serverTimestamp() };
  if (input.title !== undefined) patch.title = input.title.slice(0, 200);
  if (input.description !== undefined) patch.description = input.description || null;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  await ref.update(patch);
  return toSection(courseId, await ref.get());
}

/** Delete a section; its chapters are kept but become ungrouped (sectionId=null). */
export async function deleteSection(courseId: string, sectionId: string): Promise<void> {
  const owned = await chaptersCol(courseId).where("sectionId", "==", sectionId).get();
  const batch = adminDb.batch();
  owned.forEach((c) => batch.update(c.ref, { sectionId: null }));
  batch.delete(sectionsCol(courseId).doc(sectionId));
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
    sectionId: input.sectionId ?? null,
    isPublished: input.isPublished === true,
    sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : Date.now(),
    blocks: normalizeBlocksForStorage(input.blocks),
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
  if (input.sectionId !== undefined) patch.sectionId = input.sectionId ?? null;
  if (input.isPublished !== undefined) patch.isPublished = input.isPublished === true;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.blocks !== undefined) patch.blocks = normalizeBlocksForStorage(input.blocks);
  Object.assign(patch, pickBuckets(input));
  await ref.update(patch);
  return getChapter(courseId, chapterId);
}

export async function deleteChapter(courseId: string, chapterId: string): Promise<void> {
  await chaptersCol(courseId).doc(chapterId).delete();
}

// ---------------- Admin stats ----------------

/** Aggregate metrics for the admin dashboard. */
export async function getAdminStats(): Promise<AdminStats> {
  const courses = await listCourses(true);
  const perCourse = await Promise.all(
    courses.map(async (c) => {
      const [sections, chapters] = await Promise.all([
        sectionsCol(c.id).count().get(),
        chaptersCol(c.id).count().get(),
      ]);
      return { sections: sections.data().count, chapters: chapters.data().count };
    }),
  );

  const [threadsSnap, unansweredSnap] = await Promise.all([
    adminDb.collection("lms_forum_threads").count().get(),
    adminDb.collection("lms_forum_threads").where("replyCount", "==", 0).count().get(),
  ]);

  return {
    totalCourses: courses.length,
    publishedCourses: courses.filter((c) => c.isPublished).length,
    draftCourses: courses.filter((c) => !c.isPublished).length,
    totalSections: perCourse.reduce((n, p) => n + p.sections, 0),
    totalChapters: perCourse.reduce((n, p) => n + p.chapters, 0),
    communityThreads: threadsSnap.data().count,
    unansweredThreads: unansweredSnap.data().count,
  };
}
