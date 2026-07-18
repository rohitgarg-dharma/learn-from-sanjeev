/**
 * Shared LMS domain types. Used by both the client fetch layer and the
 * server-only Admin SDK data layer so the two always agree on shapes.
 *
 * Model:
 *   Course -> Sections -> Chapters, each chapter holding typed material arrays.
 *   Sections are an ordered grouping level; a chapter belongs to a section via
 *   `sectionId` (null = ungrouped). A content tab is shown to learners only if
 *   its array is non-empty (Posters are optional).
 */

/** A video: an external embed (YouTube/Vimeo) or an uploaded/direct file URL. */
export interface VideoItem {
  id: string;
  title: string;
  /**
   * Playable URL. For provider "file" videos backed by our media bucket
   * (`storagePath` set) this is minted as a short-lived signed URL at read time
   * and is NOT persisted — Firestore stores an empty string for it.
   */
  url: string;
  provider: "youtube" | "vimeo" | "file";
  /**
   * Object path in the media bucket (e.g. `lms-media/<hash>.mp4`) for videos we
   * host. When present the server serves the video via a time-limited signed URL.
   */
  storagePath?: string;
  description?: string;
  /** Optional rich-text notes (sanitized HTML) shown to learners with the video. */
  notes?: string;
}

/** A book: a print-ready PDF (inline viewer + download) or an ePub (download). */
export interface BookItem {
  id: string;
  title: string;
  url: string;
  format: "pdf" | "epub";
  /** PDFs laid out ready to print. Purely informational for the learner. */
  printReady?: boolean;
}

/** A poster / image. */
export interface PosterItem {
  id: string;
  title?: string;
  url: string;
}

/** Any other downloadable material (docs, slides, worksheets, etc.). */
export interface MaterialItem {
  id: string;
  title: string;
  url: string;
  contentType?: string;
  sizeBytes?: number;
}

/** The four content buckets shared by courses and chapters. */
export interface ContentBuckets {
  videos: VideoItem[];
  books: BookItem[];
  posters: PosterItem[];
  materials: MaterialItem[];
}

/**
 * A single block in a chapter's ordered content flow. Chapters can mix any
 * number of these in any order (video, text, audio, image, downloadable file).
 * Bucket-hosted blocks carry a `storagePath` and are served to learners via a
 * short-lived signed URL (the persisted `url` is blanked for those).
 */
export type BlockType = "richtext" | "video" | "audio" | "image" | "file";

interface BlockBase {
  id: string;
  type: BlockType;
}
export interface RichTextBlock extends BlockBase {
  type: "richtext";
  html: string;
}
export interface VideoBlock extends BlockBase {
  type: "video";
  title?: string;
  url: string;
  provider: "youtube" | "vimeo" | "file";
  storagePath?: string;
}
export interface AudioBlock extends BlockBase {
  type: "audio";
  title?: string;
  url: string;
  storagePath?: string;
  contentType?: string;
  sizeBytes?: number;
}
export interface ImageBlock extends BlockBase {
  type: "image";
  url: string;
  storagePath?: string;
  caption?: string;
}
export interface FileBlock extends BlockBase {
  type: "file";
  name: string;
  url: string;
  storagePath?: string;
  contentType?: string;
  sizeBytes?: number;
}
export type ChapterBlock =
  | RichTextBlock
  | VideoBlock
  | AudioBlock
  | ImageBlock
  | FileBlock;

/** An ordered grouping of chapters within a course. */
export interface Section {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  sortOrder: number;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface Chapter extends ContentBuckets {
  id: string;
  courseId: string;
  /** Owning section; null/undefined means ungrouped. */
  sectionId: string | null;
  title: string;
  description?: string;
  /** Ordered content blocks rendered top-to-bottom in the player. */
  blocks: ChapterBlock[];
  sortOrder: number;
  isPublished: boolean;
  createdAt: number | null;
  updatedAt: number | null;
}

/**
 * A teacher/instructor ("Acharya"). Stored top-level in `lms_teachers/{id}` and
 * referenced by courses via `teacherIds` (a course can have many teachers, and a
 * teacher can appear on many courses).
 */
export interface Teacher {
  id: string;
  name: string;
  /** Optional role/subtitle, e.g. "Acharya" or "Sanskrit Scholar". */
  title?: string;
  /** Longer description / biography shown to learners. */
  bio?: string;
  photoUrl?: string;
  createdAt: number | null;
  updatedAt: number | null;
}

/** Writable fields for creating/updating a teacher (admin). */
export type TeacherInput = Partial<Pick<Teacher, "name" | "title" | "bio" | "photoUrl">>;

export interface Course extends ContentBuckets {
  id: string;
  title: string;
  /** Short description shown in course listings and previews. */
  description: string;
  coverImageUrl?: string;
  category?: string;
  /** Difficulty label, e.g. "Beginner". */
  level?: string;
  /** Discovery tags (normalized to lowercase). */
  tags: string[];
  /** Ids of the teachers (Acharyas) assigned to this course. */
  teacherIds: string[];
  /** Optional promo/"about" video URL (YouTube/Vimeo/file). */
  promoVideoUrl?: string;
  /** Longer "About this course" body (plain text, one bullet per line). */
  aboutContent?: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: number | null;
  updatedAt: number | null;
}

/** Course with its ordered sections + chapters, from the course-detail endpoint. */
export interface CourseWithChapters {
  course: Course;
  sections: Section[];
  chapters: Chapter[];
  /** Resolved teachers for `course.teacherIds`, in assignment order. */
  teachers: Teacher[];
}

/** Response from the media upload endpoint. */
export interface MediaUploadResponse {
  url: string;
  /** Object path in the media bucket, used to mint signed URLs for videos. */
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  originalFilename: string;
}

// ---------------- Community (forum) ----------------

/**
 * A community attachment. Richer than gurukula's bare URL strings so previews
 * can be rendered by content type (image inline, PDF viewer, file chip).
 */
export interface Attachment {
  url: string;
  contentType: string;
  name: string;
  sizeBytes: number;
}

/** A community question/discussion. `courseId` null means a general thread. */
export interface ForumThread {
  id: string;
  courseId: string | null;
  courseTitle: string | null;
  /** Optional narrowing: the section (lesson) and chapter the question is about. */
  sectionId: string | null;
  sectionTitle: string | null;
  chapterId: string | null;
  chapterTitle: string | null;
  authorUid: string;
  authorName: string;
  authorPhoto: string | null;
  title: string;
  body: string;
  attachments: Attachment[];
  replyCount: number;
  createdAt: number | null;
  updatedAt: number | null;
}

/** A reply to a thread. */
export interface ForumReply {
  id: string;
  threadId: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string | null;
  body: string;
  attachments: Attachment[];
  createdAt: number | null;
}

export interface ThreadWithReplies {
  thread: ForumThread;
  replies: ForumReply[];
}

/** Payload to create a thread. */
export interface ThreadInput {
  courseId?: string | null;
  sectionId?: string | null;
  chapterId?: string | null;
  title: string;
  body: string;
  attachments?: Attachment[];
}

/** Payload to create a reply. */
export interface ReplyInput {
  body: string;
  attachments?: Attachment[];
}

/** Writable fields for creating/updating a course (admin). */
export type CourseInput = Partial<
  Pick<
    Course,
    | "title"
    | "description"
    | "coverImageUrl"
    | "category"
    | "level"
    | "tags"
    | "teacherIds"
    | "promoVideoUrl"
    | "aboutContent"
    | "isPublished"
    | "sortOrder"
    | "videos"
    | "books"
    | "posters"
    | "materials"
  >
>;

/** Writable fields for creating/updating a chapter (admin). */
export type ChapterInput = Partial<
  Pick<
    Chapter,
    | "title"
    | "description"
    | "sectionId"
    | "isPublished"
    | "sortOrder"
    | "blocks"
    | "videos"
    | "books"
    | "posters"
    | "materials"
  >
>;

/** Writable fields for creating/updating a section (admin). */
export type SectionInput = Partial<Pick<Section, "title" | "description" | "sortOrder">>;

/** Admin dashboard aggregate metrics. */
export interface AdminStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalSections: number;
  totalChapters: number;
  communityThreads: number;
  unansweredThreads: number;
}

export const EMPTY_BUCKETS: ContentBuckets = {
  videos: [],
  books: [],
  posters: [],
  materials: [],
};
