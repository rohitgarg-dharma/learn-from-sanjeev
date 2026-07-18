import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/guards";
import { updateTeacher, deleteTeacher } from "@/lib/server/teachers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ teacherId: string }> };

/** Update a teacher (admin only). */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { teacherId } = await params;
  const body = await request.json().catch(() => ({}));
  const teacher = await updateTeacher(teacherId, body);
  if (!teacher) return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
  return NextResponse.json({ teacher });
}

/** Delete a teacher and unlink it from any courses (admin only). */
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { teacherId } = await params;
  await deleteTeacher(teacherId);
  return NextResponse.json({ ok: true });
}
