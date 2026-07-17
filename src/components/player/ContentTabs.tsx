"use client";

import { useMemo, useState } from "react";
import type { ContentBuckets } from "@/lib/lms/types";
import { TAB_LABELS, nonEmptyTabs, type TabKey } from "@/lib/lms/content";
import { VideoRenderer } from "./VideoRenderer";
import { BookRenderer } from "./BookRenderer";
import { PosterGallery } from "./PosterGallery";
import { MaterialList } from "./MaterialList";

/**
 * Renders a chapter's (or course's) content as tabs. Only tabs with content are
 * shown; the tab strip wraps on small screens for mobile responsiveness.
 */
export function ContentTabs({ buckets }: { buckets: ContentBuckets }) {
  const tabs = useMemo(() => nonEmptyTabs(buckets), [buckets]);
  const [selected, setSelected] = useState<TabKey | null>(null);

  // Derive the effective tab during render so a changed content set (e.g.
  // switching chapters) can't leave us pointing at a now-hidden tab.
  const active = selected && tabs.includes(selected) ? selected : (tabs[0] ?? null);

  if (tabs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No content in this section yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-background p-1.5 shadow-[0_0_6px_rgba(0,0,0,0.06)]">
        {tabs.map((key) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`rounded-lg px-4 py-2 text-sm transition-all duration-200 ${
              key === active
                ? "bg-saffron font-semibold text-foreground"
                : "text-muted-foreground hover:bg-saffron/50"
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div>
        {active === "videos" && <VideoRenderer videos={buckets.videos} />}
        {active === "books" && <BookRenderer books={buckets.books} />}
        {active === "posters" && <PosterGallery posters={buckets.posters} />}
        {active === "materials" && <MaterialList materials={buckets.materials} />}
      </div>
    </div>
  );
}
