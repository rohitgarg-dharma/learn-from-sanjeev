import { NextResponse } from "next/server";
import { isAdminToken } from "@/lib/firebase/admin";
import { requireUser, requireAdmin } from "@/lib/server/guards";
import { getCourseWithChapters, updateCourse, deleteCourse } from "@/lib/server/courses";
import { signVideoItems } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ courseId: string }> };

/**
 * Get a course with its chapters. Learners get published content only.
 * Bucket-hosted videos are served via freshly minted, time-limited signed URLs.
 */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { courseId } = await params;
  const data = await getCourseWithChapters(courseId, isAdminToken(auth.decoded));
  if (!data) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  const [courseVideos, chapters] = await Promise.all([
    signVideoItems(data.course.videos),
    Promise.all(
      data.chapters.map(async (c) => ({ ...c, videos: await signVideoItems(c.videos) })),
    ),
  ]);
  return NextResponse.json({
    ...data,
    course: { ...data.course, videos: courseVideos },
    chapters,
  });
}

/** Update a course (admin only). */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { courseId } = await params;
  const body = await request.json().catch(() => ({}));
  const course = await updateCourse(courseId, body);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  return NextResponse.json({ course });
}

/** Delete a course and its chapters (admin only). */
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { courseId } = await params;
  await deleteCourse(courseId);
  return NextResponse.json({ ok: true });
}
