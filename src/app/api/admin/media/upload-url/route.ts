import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/guards";
import { createDirectUpload, MediaError } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The browser's origin, resolved from forwarded headers. On App Hosting /
 * Cloud Run `request.url` is the internal bind address, so we prefer the proxy's
 * forwarded host. GCS bakes this origin into the resumable session for CORS.
 */
function browserOrigin(request: Request): string {
  const h = request.headers;
  const explicit = h.get("origin");
  if (explicit) return explicit;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

/**
 * Starts a resumable upload session (admin only). The browser uploads the file
 * directly to Cloud Storage using the returned `uploadUrl`, so large files
 * (multi-GB video/audio) never hit the API route's body/memory limits.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename.trim() : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  if (!filename) {
    return NextResponse.json({ error: "A filename is required." }, { status: 400 });
  }

  try {
    const result = await createDirectUpload(filename, contentType, browserOrigin(request));
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof MediaError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[media] could not start resumable upload:", err);
    return NextResponse.json({ error: "Could not start upload." }, { status: 500 });
  }
}
