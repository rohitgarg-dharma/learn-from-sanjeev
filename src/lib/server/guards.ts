import "server-only";
import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { verifyBearer, isAdminToken } from "@/lib/firebase/admin";

/**
 * Route guards. `requireUser` gates learner endpoints (any signed-in Google
 * account); `requireAdmin` additionally requires a verified @ritvijam.com email.
 * Each returns either a decoded token or a ready-to-return error response.
 */

export async function requireUser(
  request: Request,
): Promise<{ decoded: DecodedIdToken } | { error: NextResponse }> {
  const decoded = await verifyBearer(request.headers.get("authorization"));
  if (!decoded) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  return { decoded };
}

export async function requireAdmin(
  request: Request,
): Promise<{ decoded: DecodedIdToken } | { error: NextResponse }> {
  const decoded = await verifyBearer(request.headers.get("authorization"));
  if (!decoded) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  if (!isAdminToken(decoded)) {
    return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  }
  return { decoded };
}
