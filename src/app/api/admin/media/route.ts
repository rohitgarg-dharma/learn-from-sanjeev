import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/guards";
import { uploadMedia, MediaError } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Upload a media file to Cloud Storage (admin only). Expects multipart form
 *  data with a `file` field; returns a browser-loadable URL. */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
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
    console.error("[media] upload failed:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
