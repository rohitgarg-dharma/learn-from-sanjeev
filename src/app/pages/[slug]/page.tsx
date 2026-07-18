"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { RichText } from "@/components/RichText";
import { fetchSiteContent } from "@/lib/lms/client";
import { SITE_PAGES, type SiteContent } from "@/lib/lms/site-pages";

/** Renders an admin-authored informational page (Terms, Contact Us, etc.). */
export default function SiteInfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const page = SITE_PAGES.find((p) => p.slug === slug);

  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSiteContent()
      .then(setContent)
      .catch((e) => setError(e.message));
  }, []);

  const html = page && content ? content[page.key] : "";
  const hasContent = (html ?? "").trim().length > 0;

  return (
    <div className="min-h-dvh">
      <AppHeader subtitle={page?.label ?? "Page"} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {!page ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This page doesn’t exist.
            </p>
          </>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : content === null ? (
          <p className="text-sm text-muted-foreground">
            <span className="animate-pulse">Loading…</span>
          </p>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">{page.label}</h1>
            {hasContent ? (
              <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <RichText html={html} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                This page hasn’t been set up yet.
              </p>
            )}
          </>
        )}

        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Back to courses
        </Link>
      </main>
    </div>
  );
}
