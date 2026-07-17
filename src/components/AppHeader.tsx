"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

/** Top bar shown on learner and admin pages: brand, admin link, sign-out. */
export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2 3 7l9 5 9-5-9-5Z" />
              <path d="M3 12l9 5 9-5" />
              <path d="M3 17l9 5 9-5" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold leading-tight tracking-tight">
              Learn from <span className="text-primary">Sanjeev</span>
            </span>
            {subtitle && (
              <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
            )}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-[#8b1717]"
            >
              Admin
            </Link>
          )}
          {user?.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              className="hidden h-8 w-8 rounded-full ring-1 ring-border sm:block"
              referrerPolicy="no-referrer"
            />
          )}
          <button
            onClick={() => void logout()}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
