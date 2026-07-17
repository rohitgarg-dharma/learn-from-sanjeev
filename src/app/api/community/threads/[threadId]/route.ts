import { NextResponse } from "next/server";
import { isAdminToken } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/guards";
import { getThreadWithReplies, getThreadAuthor, deleteThread } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ threadId: string }> };

/** Get a thread with its replies. */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { threadId } = await params;
  const data = await getThreadWithReplies(threadId);
  if (!data) return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  return NextResponse.json(data);
}

/** Delete a thread. Allowed for the author or an admin. */
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { threadId } = await params;

  const authorUid = await getThreadAuthor(threadId);
  if (authorUid === null) return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  if (authorUid !== auth.decoded.uid && !isAdminToken(auth.decoded)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  await deleteThread(threadId);
  return NextResponse.json({ ok: true });
}
