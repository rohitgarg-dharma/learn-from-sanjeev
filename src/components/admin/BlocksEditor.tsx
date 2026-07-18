"use client";

import type { ChapterBlock, BlockType } from "@/lib/lms/types";
import { detectProvider } from "@/lib/lms/content";
import { formatSize } from "@/lib/community/format";
import { MediaUploader } from "./MediaUploader";
import { RichTextEditor } from "./RichTextEditor";

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40";

const TYPE_LABELS: Record<BlockType, string> = {
  richtext: "Text",
  video: "Video",
  audio: "Audio",
  image: "Image",
  file: "File",
};

function newBlock(type: BlockType): ChapterBlock {
  const id = genId();
  switch (type) {
    case "richtext":
      return { id, type, html: "" };
    case "video":
      return { id, type, title: "", url: "", provider: "file" };
    case "audio":
      return { id, type, title: "", url: "" };
    case "image":
      return { id, type, url: "", caption: "" };
    case "file":
      return { id, type, name: "", url: "" };
  }
}

/**
 * Ordered block builder for a chapter: mix text / video / audio / image / file
 * blocks in any order. Uploaded media is stored in the bucket (storagePath) and
 * served to learners via signed URLs; the block also keeps the upload's URL for
 * immediate in-editor preview (it's blanked server-side on save).
 */
export function BlocksEditor({
  blocks,
  onChange,
}: {
  blocks: ChapterBlock[];
  onChange: (next: ChapterBlock[]) => void;
}) {
  const update = (i: number, next: ChapterBlock) =>
    onChange(blocks.map((b, j) => (j === i ? next : b)));
  const remove = (i: number) => onChange(blocks.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = (type: BlockType) => onChange([...blocks, newBlock(type)]);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Content blocks
        </h4>
        <span className="text-xs text-muted-foreground">
          {blocks.length} block{blocks.length === 1 ? "" : "s"} · shown top-to-bottom
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {blocks.map((block, i) => (
          <div key={block.id} className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <span className="rounded-full bg-saffron px-2.5 py-0.5 text-xs font-semibold text-primary">
                {TYPE_LABELS[block.type]}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === blocks.length - 1}
                  className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(i)}
                  className="rounded px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="p-3">
              <BlockBody block={block} onChange={(next) => update(i, next)} />
            </div>
          </div>
        ))}

        {blocks.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No blocks yet. Add text, video, audio, images or files below — in any order.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as BlockType[]).map((type) => (
          <button
            key={type}
            onClick={() => add(type)}
            className="rounded-lg border border-primary/40 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-saffron"
          >
            + {TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </section>
  );
}

function BlockBody({
  block,
  onChange,
}: {
  block: ChapterBlock;
  onChange: (next: ChapterBlock) => void;
}) {
  switch (block.type) {
    case "richtext":
      return (
        <RichTextEditor
          value={block.html}
          onChange={(html) => onChange({ ...block, html })}
          placeholder="Write text for this block…"
        />
      );

    case "video":
      return (
        <div className="flex flex-col gap-2">
          <input
            className={inputClass}
            placeholder="Title (optional)"
            value={block.title ?? ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Paste YouTube / Vimeo / video URL"
            value={block.storagePath ? "" : block.url}
            onChange={(e) =>
              onChange({
                ...block,
                url: e.target.value,
                provider: detectProvider(e.target.value),
                storagePath: undefined,
              })
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <MediaUploader
              accept="video/*"
              label="Upload video"
              onUploaded={(r) =>
                onChange({ ...block, url: r.url, storagePath: r.storagePath, provider: "file" })
              }
            />
            <input
              className={`${inputClass} flex-1`}
              placeholder="…or storage path (lms-media/….mp4)"
              value={block.storagePath ?? ""}
              onChange={(e) =>
                onChange({
                  ...block,
                  storagePath: e.target.value.trim().replace(/^\/+/, "") || undefined,
                  provider: "file",
                })
              }
            />
          </div>
          <SourceHint storagePath={block.storagePath} url={block.url} provider={block.provider} />
        </div>
      );

    case "audio":
      return (
        <div className="flex flex-col gap-2">
          <input
            className={inputClass}
            placeholder="Title (optional), e.g. Audio-only lecture"
            value={block.title ?? ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <MediaUploader
              accept="audio/*"
              label="Upload audio"
              onUploaded={(r) =>
                onChange({
                  ...block,
                  url: r.url,
                  storagePath: r.storagePath,
                  contentType: r.contentType,
                  sizeBytes: r.sizeBytes,
                })
              }
            />
            <input
              className={`${inputClass} flex-1`}
              placeholder="…or paste an audio URL"
              value={block.storagePath ? "" : block.url}
              onChange={(e) =>
                onChange({ ...block, url: e.target.value, storagePath: undefined })
              }
            />
          </div>
          <SourceHint storagePath={block.storagePath} url={block.url} sizeBytes={block.sizeBytes} />
        </div>
      );

    case "image":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {block.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.url} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                No image
              </span>
            )}
            <MediaUploader
              accept="image/*"
              label="Upload image"
              onUploaded={(r) => onChange({ ...block, url: r.url, storagePath: r.storagePath })}
            />
          </div>
          <input
            className={inputClass}
            placeholder="Caption (optional)"
            value={block.caption ?? ""}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
          />
        </div>
      );

    case "file":
      return (
        <div className="flex flex-col gap-2">
          <input
            className={inputClass}
            placeholder="Label, e.g. Download audio-only file"
            value={block.name}
            onChange={(e) => onChange({ ...block, name: e.target.value })}
          />
          <MediaUploader
            label="Upload file"
            onUploaded={(r) =>
              onChange({
                ...block,
                name: block.name || r.originalFilename,
                url: r.url,
                storagePath: r.storagePath,
                contentType: r.contentType,
                sizeBytes: r.sizeBytes,
              })
            }
          />
          <SourceHint storagePath={block.storagePath} url={block.url} sizeBytes={block.sizeBytes} />
        </div>
      );
  }
}

function SourceHint({
  storagePath,
  url,
  provider,
  sizeBytes,
}: {
  storagePath?: string;
  url?: string;
  provider?: string;
  sizeBytes?: number;
}) {
  const size = formatSize(sizeBytes);
  let text: string;
  if (storagePath) text = `hosted · signed URL · ${storagePath}`;
  else if (url) text = `${provider ? `${provider} · ` : ""}${url}`;
  else text = "No source yet — upload or paste a URL.";
  return (
    <p className="truncate text-xs text-muted-foreground">
      {text}
      {size ? ` · ${size}` : ""}
    </p>
  );
}
