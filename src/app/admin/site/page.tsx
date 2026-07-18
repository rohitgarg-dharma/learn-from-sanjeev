"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { fetchSiteContent, updateSiteContent } from "@/lib/lms/client";
import { SITE_PAGES, EMPTY_SITE_CONTENT, type SiteContent, type SiteContentKey } from "@/lib/lms/site-pages";

export default function AdminSitePage() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  if (!isAdmin) {
    return (
      <div className="min-h-dvh">
        <AppHeader subtitle="Admin" />
        <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-muted-foreground">
          Admins only.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <AppHeader subtitle="Admin" />
      <Editor />
    </div>
  );
}

function Editor() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    fetchSiteContent()
      .then(setContent)
      .catch((e) => setError(e.message));
  }, []);

  const set = (key: SiteContentKey, html: string) =>
    setContent((c) => ({ ...(c ?? EMPTY_SITE_CONTENT), [key]: html }));

  const save = async () => {
    if (!content || status === "saving") return;
    setStatus("saving");
    setError(null);
    try {
      const updated = await updateSiteContent(content);
      setContent(updated);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      setStatus("idle");
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link
          href="/admin"
          className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
        >
          ← Admin
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Site Pages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These appear in the footer on every page. Leave a section empty to hide its footer link.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {content === null ? (
        <p className="text-sm text-muted-foreground">
          <span className="animate-pulse">Loading…</span>
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {SITE_PAGES.map((p) => (
            <section key={p.slug} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{p.label}</h2>
                <Link
                  href={`/pages/${p.slug}`}
                  target="_blank"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Preview ↗
                </Link>
              </div>
              <RichTextEditor
                value={content[p.key]}
                onChange={(html) => set(p.key, html)}
                placeholder={`Write the ${p.label} content shown to visitors…`}
              />
            </section>
          ))}

          <div className="sticky bottom-4 flex justify-end">
            <button
              onClick={save}
              disabled={status === "saving"}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium shadow-sm transition disabled:opacity-60 ${
                status === "saved"
                  ? "bg-success text-white"
                  : "bg-primary text-primary-foreground hover:bg-[#8b1717]"
              }`}
            >
              {status === "saved" && (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save all pages"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
