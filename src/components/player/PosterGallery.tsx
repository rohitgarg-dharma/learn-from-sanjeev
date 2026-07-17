"use client";

import { useState } from "react";
import type { PosterItem } from "@/lib/lms/types";

/** Responsive image grid with a simple full-screen lightbox. */
export function PosterGallery({ posters }: { posters: PosterItem[] }) {
  const [active, setActive] = useState<PosterItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {posters.map((poster) => (
          <button
            key={poster.id}
            onClick={() => setActive(poster)}
            className="group overflow-hidden rounded-xl border border-border bg-muted transition-shadow hover:shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster.url}
              alt={poster.title ?? "Poster"}
              className="aspect-[3/4] w-full object-cover transition group-hover:scale-105"
              loading="lazy"
            />
            {poster.title && (
              <div className="truncate bg-card p-2 text-left text-xs text-muted-foreground">
                {poster.title}
              </div>
            )}
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActive(null)}
        >
          <div className="relative max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.title ?? "Poster"}
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="truncate text-sm text-white/90">{active.title}</span>
              <div className="flex gap-2">
                <a
                  href={active.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
                >
                  Download
                </a>
                <button
                  onClick={() => setActive(null)}
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
