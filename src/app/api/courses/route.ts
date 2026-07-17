import { NextResponse } from "next/server";
import { isAdminToken } from "@/lib/firebase/admin";
import { requireUser, requireAdmin } from "@/lib/server/guards";
import { listCourses, createCourse } from "@/lib/server/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List courses. Learners see published courses; admins see everything. */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const courses = await listCourses(isAdminToken(auth.decoded));
  return NextResponse.json({ courses });
}

/** Create a course (admin only). */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  const course = await createCourse(body);
  return NextResponse.json({ course }, { status: 201 });
}
