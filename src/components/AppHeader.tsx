"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

/** Top bar shown on learner and admin pages: brand, admin link, sign-out. */
export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Learn from Sanjeev</span>
          {subtitle && (
            <span className="hidden truncate text-sm text-neutral-400 sm:inline">/ {subtitle}</span>
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Admin
            </Link>
          )}
          {user?.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              className="hidden h-8 w-8 rounded-full sm:block"
              referrerPolicy="no-referrer"
            />
          )}
          <button
            onClick={() => void logout()}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
