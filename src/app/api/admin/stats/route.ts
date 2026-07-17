import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/guards";
import { getAdminStats } from "@/lib/server/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aggregate metrics for the admin dashboard (admin only). */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const stats = await getAdminStats();
  return NextResponse.json({ stats });
}
