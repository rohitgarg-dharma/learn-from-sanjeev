"use client";

import Link from "next/link";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { SITE_PAGES } from "@/lib/lms/site-pages";

/**
 * Site-wide footer shown on every page. Links to the informational pages that
 * an admin has filled in (Contact Us, Terms, Disclaimer, Refund & Cancellation).
 */
export function SiteFooter() {
  const { content, siteTitle } = useSiteSettings();

  const pages = SITE_PAGES.filter((p) => (content?.[p.key] ?? "").trim().length > 0);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {year} {siteTitle}. All rights reserved.</p>
        {pages.length > 0 && (
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {pages.map((p) => (
              <Link
                key={p.slug}
                href={`/pages/${p.slug}`}
                className="transition hover:text-primary"
              >
                {p.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
