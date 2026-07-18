import { getFirebaseAuth } from "@/lib/firebase/client";
import type {
  AdminStats,
  Course,
  CourseInput,
  CourseWithChapters,
  Chapter,
  ChapterInput,
  MediaUploadResponse,
  Section,
  SectionInput,
} from "@/lib/lms/types";

/**
 * Browser-side fetch wrappers. Every call attaches the signed-in user's Firebase
 * ID token as a Bearer header; the API routes verify it (and gate admin ops).
 */

async function authHeader(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status}).`);
  return data;
}

// ---------------- Courses (learner + admin) ----------------

export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch("/api/courses", { headers: await authHeader() });
  return (await jsonOrThrow(res)).courses ?? [];
}

export async function fetchCourse(courseId: string): Promise<CourseWithChapters> {
  const res = await fetch(`/api/courses/${courseId}`, { headers: await authHeader() });
  return jsonOrThrow(res) as Promise<CourseWithChapters>;
}

// ---------------- Progress (learner) ----------------

/** The signed-in learner's completed chapter ids for a course. */
export async function fetchProgress(courseId: string): Promise<string[]> {
  const res = await fetch(`/api/courses/${courseId}/progress`, { headers: await authHeader() });
  return (await jsonOrThrow(res)).completedChapterIds ?? [];
}

/** Mark a chapter complete/incomplete; returns the updated completed set. */
export async function markChapterComplete(
  courseId: string,
  chapterId: string,
  completed = true,
): Promise<string[]> {
  const res = await fetch(`/api/courses/${courseId}/progress`, {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({ chapterId, completed }),
  });
  return (await jsonOrThrow(res)).completedChapterIds ?? [];
}

// ---------------- Courses (admin) ----------------

export async function createCourse(input: CourseInput): Promise<Course> {
  const res = await fetch("/api/courses", {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)).course as Course;
}

export async function updateCourse(courseId: string, input: CourseInput): Promise<Course> {
  const res = await fetch(`/api/courses/${courseId}`, {
    method: "PATCH",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)).course as Course;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const res = await fetch(`/api/courses/${courseId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  await jsonOrThrow(res);
}

// ---------------- Sections (admin) ----------------

export async function createSection(courseId: string, input: SectionInput): Promise<Section> {
  const res = await fetch(`/api/courses/${courseId}/sections`, {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)).section as Section;
}

export async function updateSection(
  courseId: string,
  sectionId: string,
  input: SectionInput,
): Promise<Section> {
  const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}`, {
    method: "PATCH",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)).section as Section;
}

export async function deleteSection(courseId: string, sectionId: string): Promise<void> {
  const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  await jsonOrThrow(res);
}

// ---------------- Chapters (admin) ----------------

export async function createChapter(courseId: string, input: ChapterInput): Promise<Chapter> {
  const res = await fetch(`/api/courses/${courseId}/chapters`, {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)).chapter as Chapter;
}

export async function updateChapter(
  courseId: string,
  chapterId: string,
  input: ChapterInput,
): Promise<Chapter> {
  const res = await fetch(`/api/courses/${courseId}/chapters/${chapterId}`, {
    method: "PATCH",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)).chapter as Chapter;
}

export async function deleteChapter(courseId: string, chapterId: string): Promise<void> {
  const res = await fetch(`/api/courses/${courseId}/chapters/${chapterId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  await jsonOrThrow(res);
}

// ---------------- Admin stats ----------------

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats", { headers: await authHeader() });
  return (await jsonOrThrow(res)).stats as AdminStats;
}

// ---------------- Media upload (admin) ----------------

interface DirectUpload {
  uploadUrl: string;
  storagePath: string;
  url: string;
  contentType: string;
}

/**
 * Uploads a file to Cloud Storage. The server hands back a resumable upload
 * session and the browser streams the bytes **directly** to Storage — so large
 * files (multi-GB video/audio) never hit the API route's body/memory limits.
 * `onProgress` receives a 0..1 fraction as the upload proceeds.
 */
export async function uploadMedia(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<MediaUploadResponse> {
  const res = await fetch("/api/admin/media/upload-url", {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  const { uploadUrl, storagePath, url, contentType } = (await jsonOrThrow(res)) as DirectUpload;

  await putToSession(uploadUrl, file, contentType, onProgress);

  return {
    url,
    storagePath,
    contentType,
    sizeBytes: file.size,
    originalFilename: file.name,
  };
}

/** Streams the file to a GCS resumable session URL with upload progress. */
function putToSession(
  sessionUrl: string,
  file: File,
  contentType: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", sessionUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });
}
