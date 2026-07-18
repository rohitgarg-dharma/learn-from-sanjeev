import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/guards";
import { getCompletedChapters, setChapterCompleted } from "@/lib/server/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ courseId: string }> };

/** The signed-in learner's completed chapters for this course. */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { courseId } = await params;
  const completedChapterIds = await getCompletedChapters(auth.decoded.uid, courseId);
  return NextResponse.json({ completedChapterIds });
}

/** Mark a chapter complete/incomplete for the signed-in learner. */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { courseId } = await params;
  const body = await request.json().catch(() => ({}));
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : "";
  if (!chapterId) {
    return NextResponse.json({ error: "chapterId is required." }, { status: 400 });
  }
  const completed = body.completed !== false;
  const completedChapterIds = await setChapterCompleted(
    auth.decoded.uid,
    courseId,
    chapterId,
    completed,
  );
  return NextResponse.json({ completedChapterIds });
}
