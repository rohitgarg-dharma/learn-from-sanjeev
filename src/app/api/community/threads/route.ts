import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/guards";
import { listThreads, createThread, type ThreadScope } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List threads. `?courseId=<id>` scopes to a course; `?scope=general` shows
 *  only general threads; otherwise all threads are returned. */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");
  const scopeParam = url.searchParams.get("scope");
  const scope: ThreadScope = courseId
    ? { kind: "course", courseId }
    : scopeParam === "general"
      ? { kind: "general" }
      : { kind: "all" };

  const threads = await listThreads(scope);
  return NextResponse.json({ threads });
}

/** Create a thread (any signed-in user). */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { decoded } = auth;

  const body = await request.json().catch(() => ({}));
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }
  if (typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "A question body is required." }, { status: 400 });
  }

  const thread = await createThread(
    { uid: decoded.uid, name: decoded.name ?? decoded.email ?? "User", photo: decoded.picture ?? null },
    { courseId: body.courseId ?? null, title: body.title, body: body.body, attachments: body.attachments },
  );
  return NextResponse.json({ thread }, { status: 201 });
}
