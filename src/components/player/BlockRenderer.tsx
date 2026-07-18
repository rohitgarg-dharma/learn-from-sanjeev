"use client";

import type { ChapterBlock } from "@/lib/lms/types";
import { videoEmbedUrl } from "@/lib/lms/content";
import { formatSize } from "@/lib/community/format";
import { RichText } from "@/components/RichText";
import { FilePreview } from "./FilePreview";

/** Renders a chapter's ordered content blocks top-to-bottom for learners. */
export function BlockRenderer({ blocks }: { blocks?: ChapterBlock[] }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: ChapterBlock }) {
  switch (block.type) {
    case "richtext":
      return <RichText html={block.html} />;

    case "video": {
      if (!block.url && !block.storagePath) return null;
      const embed = videoEmbedUrl({
        id: block.id,
        title: block.title ?? "",
        url: block.url,
        provider: block.provider,
      });
      return (
        <figure className="flex flex-col gap-2">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            {embed ? (
              <iframe
                src={embed}
                title={block.title || "Video"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={block.url} controls className="h-full w-full" preload="metadata" />
            )}
          </div>
          {block.title && <figcaption className="text-sm font-medium">{block.title}</figcaption>}
        </figure>
      );
    }

    case "audio": {
      if (!block.url) return null;
      return (
        <div className="rounded-xl border border-border bg-background p-4">
          {block.title && <p className="mb-2 text-sm font-medium">{block.title}</p>}
          <audio src={block.url} controls className="w-full" preload="none" />
          <div className="mt-2">
            <DownloadLink url={block.url} label="Download audio" sizeBytes={block.sizeBytes} />
          </div>
        </div>
      );
    }

    case "image":
      if (!block.url) return null;
      return (
        <figure className="flex flex-col gap-2">
          <FilePreview
            url={block.url}
            name={block.caption || "Image"}
            contentType="image/*"
          />
          {block.caption && (
            <figcaption className="text-center text-xs text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "file":
      if (!block.url) return null;
      return (
        <FilePreview
          url={block.url}
          name={block.name || "File"}
          contentType={block.contentType}
          sizeBytes={block.sizeBytes}
        />
      );
  }
}

function DownloadLink({
  url,
  label,
  sizeBytes,
  prominent,
}: {
  url: string;
  label: string;
  sizeBytes?: number;
  prominent?: boolean;
}) {
  const size = formatSize(sizeBytes);
  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg text-sm font-medium transition ${
        prominent
          ? "bg-primary px-4 py-2.5 text-primary-foreground shadow-sm hover:bg-[#8b1717]"
          : "border border-border px-3 py-2 text-primary hover:bg-saffron"
      }`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
      {label}
      {size && <span className={prominent ? "opacity-80" : "text-muted-foreground"}>· {size}</span>}
    </a>
  );
}
