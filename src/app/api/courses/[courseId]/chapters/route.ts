import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/guards";
import { createChapter } from "@/lib/server/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ courseId: string }> };

/** Create a chapter under a course (admin only). */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { courseId } = await params;
  const body = await request.json().catch(() => ({}));
  const chapter = await createChapter(courseId, body);
  if (!chapter) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  return NextResponse.json({ chapter }, { status: 201 });
}
