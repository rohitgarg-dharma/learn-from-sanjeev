/**
 * Admin identification. An "admin" is anyone whose (verified) Google account
 * email is on the ritvijam.com domain. Admins can create courses, chapters, and
 * upload materials.
 *
 * This is enforced server-side in the admin API routes (see `isAdminToken` in
 * `src/lib/firebase/admin.ts`); the client-side check below only decides whether
 * to show the admin UI.
 */
export const ADMIN_EMAIL_DOMAIN = "ritvijam.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(`@${ADMIN_EMAIL_DOMAIN}`);
}
