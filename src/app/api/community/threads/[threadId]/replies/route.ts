import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/guards";
import { addReply } from "@/lib/server/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ threadId: string }> };

/** Add a reply to a thread (any signed-in user). */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { threadId } = await params;
  const { decoded } = auth;

  const body = await request.json().catch(() => ({}));
  if (typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "A reply body is required." }, { status: 400 });
  }

  const reply = await addReply(
    threadId,
    { uid: decoded.uid, name: decoded.name ?? decoded.email ?? "User", photo: decoded.picture ?? null },
    { body: body.body, attachments: body.attachments },
  );
  if (!reply) return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  return NextResponse.json({ reply }, { status: 201 });
}
