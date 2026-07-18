"use client";

import { useState } from "react";
import { formatSize } from "@/lib/community/format";
import { useFullscreen } from "./useFullscreen";

type FileKind = "pdf" | "image" | "other";

function fileKind(url: string, contentType?: string): FileKind {
  const ct = (contentType ?? "").toLowerCase();
  const path = url.split("?")[0].toLowerCase();
  if (ct.includes("pdf") || path.endsWith(".pdf")) return "pdf";
  if (ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(path)) return "image";
  return "other";
}

/**
 * Renders an attached file inline in the browser: PDFs in an embedded viewer,
 * images inline, everything else as a download card. Previewable files get a
 * fullscreen button plus "open in new tab" and download actions.
 */
export function FilePreview({
  url,
  name,
  contentType,
  sizeBytes,
  startExpanded = true,
}: {
  url: string;
  name: string;
  contentType?: string;
  sizeBytes?: number;
  /** Whether the inline viewer is shown initially (false = collapsible). */
  startExpanded?: boolean;
}) {
  const kind = fileKind(url, contentType);
  const previewable = kind === "pdf" || kind === "image";
  const [open, setOpen] = useState(startExpanded && previewable);
  const { ref, toggle } = useFullscreen<HTMLDivElement>();
  const size = formatSize(sizeBytes);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-saffron text-primary">
            {kind === "image" ? <ImageIcon /> : <FileIcon />}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{name}</span>
            {size && <span className="block text-xs text-muted-foreground">{size}</span>}
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {previewable && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-saffron"
            >
              {open ? "Hide" : "Preview"}
            </button>
          )}
          {previewable && open && (
            <button
              onClick={toggle}
              title="Fullscreen"
              aria-label="Fullscreen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
            >
              <ExpandIcon />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
          >
            <ExternalIcon />
            <span className="hidden sm:inline">Open</span>
          </a>
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-[#8b1717]"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </div>

      {previewable && open && (
        <div ref={ref} className="fs-target flex items-center justify-center border-t border-border bg-black">
          {kind === "pdf" ? (
            <iframe src={url} title={name} className="h-[75vh] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={name} className="max-h-[75vh] w-full object-contain" />
          )}
        </div>
      )}
    </div>
  );
}

function FileIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
