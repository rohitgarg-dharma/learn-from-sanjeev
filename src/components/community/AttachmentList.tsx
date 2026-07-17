"use client";

import { useState } from "react";
import type { Attachment } from "@/lib/lms/types";
import { formatSize } from "@/lib/community/format";

function isImage(a: Attachment): boolean {
  return a.contentType.startsWith("image/");
}
function isPdf(a: Attachment): boolean {
  return a.contentType === "application/pdf" || /\.pdf($|\?)/i.test(a.url);
}

/** Renders attachment previews: images inline, PDFs with a toggleable viewer,
 *  everything else as a downloadable file chip. */
export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {attachments.map((a, i) => (
        <AttachmentItem key={`${a.url}-${i}`} attachment={a} />
      ))}
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const [showPdf, setShowPdf] = useState(false);

  if (isImage(attachment)) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block w-fit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-80 rounded-lg border border-border object-contain"
          loading="lazy"
        />
      </a>
    );
  }

  const size = formatSize(attachment.sizeBytes);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{attachment.name}</span>
            {size && <span className="block text-xs text-muted-foreground">{size}</span>}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isPdf(attachment) && (
            <button
              onClick={() => setShowPdf((v) => !v)}
              className="rounded-lg border border-primary px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-saffron"
            >
              {showPdf ? "Hide" : "View"}
            </button>
          )}
          <a
            href={attachment.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition hover:bg-[#8b1717]"
          >
            Download
          </a>
        </div>
      </div>
      {isPdf(attachment) && showPdf && (
        <iframe src={attachment.url} title={attachment.name} className="h-[70vh] w-full border-t border-border" />
      )}
    </div>
  );
}

/** Compact thumbnail row for list/preview contexts. */
export function AttachmentThumbs({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return null;
  const images = attachments.filter((a) => a.contentType.startsWith("image/"));
  const others = attachments.length - images.length;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {images.slice(0, 3).map((a, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={a.url}
          alt=""
          className="h-16 w-16 rounded-lg border border-border object-cover"
          loading="lazy"
        />
      ))}
      {others > 0 && (
        <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          {others} file{others > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
