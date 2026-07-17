import { NextResponse } from "next/server";
import { isAdminToken } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/guards";
import { getReplyAuthor, deleteReply } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ threadId: string; replyId: string }> };

/** Delete a reply. Allowed for the author or an admin. */
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { threadId, replyId } = await params;

  const authorUid = await getReplyAuthor(threadId, replyId);
  if (authorUid === null) return NextResponse.json({ error: "Reply not found." }, { status: 404 });
  if (authorUid !== auth.decoded.uid && !isAdminToken(auth.decoded)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  await deleteReply(threadId, replyId);
  return NextResponse.json({ ok: true });
}
