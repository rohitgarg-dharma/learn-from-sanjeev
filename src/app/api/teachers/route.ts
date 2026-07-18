import { NextResponse } from "next/server";
import { requireUser, requireAdmin } from "@/lib/server/guards";
import { listTeachers, createTeacher } from "@/lib/server/teachers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List all teachers. Any signed-in user (learners see them on courses; admins
 *  pick them in the course editor). */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const teachers = await listTeachers();
  return NextResponse.json({ teachers });
}

/** Create a teacher (admin only). */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }
  const teacher = await createTeacher({
    name: body.name,
    title: body.title,
    bio: body.bio,
    photoUrl: body.photoUrl,
  });
  return NextResponse.json({ teacher }, { status: 201 });
}
