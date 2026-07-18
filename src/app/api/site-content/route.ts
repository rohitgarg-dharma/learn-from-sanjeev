import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/guards";
import { getSiteContent, setSiteContent } from "@/lib/server/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The site's informational pages. GET is public so the footer and info pages
 * render for everyone (they hold no secrets); PATCH is admin-only.
 */
export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json({ content });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  const content = await setSiteContent(body);
  return NextResponse.json({ content });
}
