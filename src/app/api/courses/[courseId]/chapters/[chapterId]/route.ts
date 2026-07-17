import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/guards";
import { updateChapter, deleteChapter } from "@/lib/server/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ courseId: string; chapterId: string }> };

/** Update a chapter (admin only). */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { courseId, chapterId } = await params;
  const body = await request.json().catch(() => ({}));
  const chapter = await updateChapter(courseId, chapterId, body);
  if (!chapter) return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  return NextResponse.json({ chapter });
}

/** Delete a chapter (admin only). */
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { courseId, chapterId } = await params;
  await deleteChapter(courseId, chapterId);
  return NextResponse.json({ ok: true });
}
