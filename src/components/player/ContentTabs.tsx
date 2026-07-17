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
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
        No content in this section yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        {tabs.map((key) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              key === active
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
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
