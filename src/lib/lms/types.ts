/**
 * Shared LMS domain types. Used by both the client fetch layer and the
 * server-only Admin SDK data layer so the two always agree on shapes.
 *
 * Model (simpler than gurukula-lms — no Lesson layer):
 *   Course -> Chapters, each holding typed material arrays. A content tab is
 *   shown to learners only if its array is non-empty (Posters are optional).
 */

/** A video: an external embed (YouTube/Vimeo) or an uploaded/direct file URL. */
export interface VideoItem {
  id: string;
  title: string;
  url: string;
  provider: "youtube" | "vimeo" | "file";
  description?: string;
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

export interface Chapter extends ContentBuckets {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface Course extends ContentBuckets {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  category?: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: number | null;
  updatedAt: number | null;
}

/** Course with its ordered chapters, returned by the course-detail endpoint. */
export interface CourseWithChapters {
  course: Course;
  chapters: Chapter[];
}

/** Response from the media upload endpoint. */
export interface MediaUploadResponse {
  url: string;
  contentType: string;
  sizeBytes: number;
  originalFilename: string;
}

/** Writable fields for creating/updating a course (admin). */
export type CourseInput = Partial<
  Pick<
    Course,
    | "title"
    | "description"
    | "coverImageUrl"
    | "category"
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
    | "isPublished"
    | "sortOrder"
    | "videos"
    | "books"
    | "posters"
    | "materials"
  >
>;

export const EMPTY_BUCKETS: ContentBuckets = {
  videos: [],
  books: [],
  posters: [],
  materials: [],
};
