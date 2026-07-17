"use client";

import { useState } from "react";
import type { BookItem } from "@/lib/lms/types";

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
  const isPdf = book.format === "pdf";

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {book.format}
            </span>
            {book.printReady && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Print-ready
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate font-medium">{book.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isPdf && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {open ? "Hide" : "Read"}
            </button>
          )}
          <a
            href={book.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Download
          </a>
        </div>
      </div>
      {isPdf && open && (
        <div className="border-t border-neutral-200 dark:border-neutral-800">
          <iframe
            src={book.url}
            title={book.title}
            className="h-[70vh] w-full rounded-b-xl"
          />
        </div>
      )}
    </div>
  );
}
