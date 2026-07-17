import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/guards";
import { updateSection, deleteSection } from "@/lib/server/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ courseId: string; sectionId: string }> };

/** Update a section (admin only). */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { courseId, sectionId } = await params;
  const body = await request.json().catch(() => ({}));
  const section = await updateSection(courseId, sectionId, body);
  if (!section) return NextResponse.json({ error: "Section not found." }, { status: 404 });
  return NextResponse.json({ section });
}

/** Delete a section; its chapters become ungrouped (admin only). */
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { courseId, sectionId } = await params;
  await deleteSection(courseId, sectionId);
  return NextResponse.json({ ok: true });
}
