import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/guards";
import { uploadMedia, MediaError } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Upload a community attachment (any signed-in user). Expects multipart form
 *  data with a `file` field; returns a browser-loadable URL + metadata. */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await uploadMedia(buffer, file.name, file.type);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof MediaError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[community/upload] failed:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
