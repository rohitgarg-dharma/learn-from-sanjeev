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

export async function uploadMedia(file: File): Promise<MediaUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/media", {
    method: "POST",
    headers: await authHeader(),
    body: form,
  });
  return jsonOrThrow(res) as Promise<MediaUploadResponse>;
}
