"use client";

import { useState } from "react";
import type { BookItem } from "@/lib/lms/types";
import { useFullscreen } from "./useFullscreen";

/** Books list: PDFs get an inline viewer + download; ePub is download-only. */
export function BookRenderer({ books }: { books: BookItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}

function BookCard({ book }: { book: BookItem }) {
  const [open, setOpen] = useState(false);
  const { ref, toggle } = useFullscreen<HTMLDivElement>();
  const isPdf = book.format === "pdf";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-saffron text-primary">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                {book.format}
              </span>
              {book.printReady && (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                  Print-ready
                </span>
              )}
            </div>
            <h3 className="mt-1 truncate font-medium">{book.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPdf && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-saffron"
            >
              {open ? "Hide" : "Read"}
            </button>
          )}
          {isPdf && open && (
            <button
              onClick={toggle}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
            >
              Fullscreen
            </button>
          )}
          <a
            href={book.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-[#8b1717]"
          >
            Download
          </a>
        </div>
      </div>
      {isPdf && open && (
        <div ref={ref} className="fs-target border-t border-border bg-black">
          <iframe src={book.url} title={book.title} className="h-[70vh] w-full" />
        </div>
      )}
    </div>
  );
}
