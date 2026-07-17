"use client";

import { useState } from "react";
import type {
  BookItem,
  ContentBuckets,
  MaterialItem,
  PosterItem,
  VideoItem,
} from "@/lib/lms/types";
import { detectProvider } from "@/lib/lms/content";
import { MediaUploader } from "./MediaUploader";
import { RichTextEditor } from "./RichTextEditor";

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * Edits the four content buckets (videos / books / posters / materials) for a
 * course or chapter. Fully controlled: emits the updated buckets via onChange.
 */
export function ContentEditor({
  buckets,
  onChange,
}: {
  buckets: ContentBuckets;
  onChange: (next: ContentBuckets) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <VideosSection
        videos={buckets.videos}
        onChange={(videos) => onChange({ ...buckets, videos })}
      />
      <BooksSection
        books={buckets.books}
        onChange={(books) => onChange({ ...buckets, books })}
      />
      <PostersSection
        posters={buckets.posters}
        onChange={(posters) => onChange({ ...buckets, posters })}
      />
      <MaterialsSection
        materials={buckets.materials}
        onChange={(materials) => onChange({ ...buckets, materials })}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

const rowClass =
  "flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between";
const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const removeBtn =
  "shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50";

// ---------------- Videos ----------------

/** A single video row: title + source caption, remove, and collapsible notes. */
function VideoRow({
  video,
  onChange,
  onRemove,
}: {
  video: VideoItem;
  onChange: (next: VideoItem) => void;
  onRemove: () => void;
}) {
  const [showNotes, setShowNotes] = useState(Boolean(video.notes));

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <input
            className={inputClass}
            value={video.title}
            placeholder="Video title"
            onChange={(e) => onChange({ ...video, title: e.target.value })}
          />
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {video.storagePath
              ? `hosted · signed URL · ${video.storagePath}`
              : `${video.provider} · ${video.url}`}
          </p>
        </div>
        <button className={removeBtn} onClick={onRemove}>
          Remove
        </button>
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowNotes((s) => !s)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showNotes ? "Hide text" : video.notes ? "Edit text" : "Add text (optional)"}
        </button>
        {showNotes && (
          <div className="mt-2">
            <RichTextEditor
              value={video.notes ?? ""}
              onChange={(html) => onChange({ ...video, notes: html })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VideosSection({
  videos,
  onChange,
}: {
  videos: VideoItem[];
  onChange: (v: VideoItem[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("");
  const [pathTitle, setPathTitle] = useState("");

  const addUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onChange([
      ...videos,
      { id: genId(), title: title.trim() || "Video", url: trimmed, provider: detectProvider(trimmed) },
    ]);
    setUrl("");
    setTitle("");
  };

  const addPath = () => {
    const trimmed = path.trim().replace(/^\/+/, "");
    if (!trimmed) return;
    onChange([
      ...videos,
      {
        id: genId(),
        title: pathTitle.trim() || "Video",
        url: "",
        provider: "file",
        storagePath: trimmed,
      },
    ]);
    setPath("");
    setPathTitle("");
  };

  return (
    <Section title="Videos">
      <div className="flex flex-col gap-2">
        {videos.map((v, i) => (
          <VideoRow
            key={v.id}
            video={v}
            onChange={(next) => onChange(videos.map((x, j) => (j === i ? next : x)))}
            onRemove={() => onChange(videos.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={inputClass}
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Paste YouTube / Vimeo / video URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={addUrl}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-[#8b1717]"
        >
          Add
        </button>
        <MediaUploader
          accept="video/*"
          label="Upload video"
          onUploaded={(r) =>
            onChange([
              ...videos,
              {
                id: genId(),
                title: r.originalFilename,
                url: "",
                provider: "file",
                storagePath: r.storagePath,
              },
            ])
          }
        />
      </div>

      <div className="mt-2 rounded-lg border border-dashed border-border bg-background/60 p-3">
        <p className="mb-2 text-xs text-muted-foreground">
          Large video already synced to the bucket? Reference it by its storage path
          (e.g. <code>lms-media/&lt;hash&gt;.mp4</code>). Learners get a signed URL.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className={inputClass}
            placeholder="Title (optional)"
            value={pathTitle}
            onChange={(e) => setPathTitle(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Storage path (e.g. lms-media/abc123.mp4)"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <button
            onClick={addPath}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-[#8b1717]"
          >
            Add by path
          </button>
        </div>
      </div>
    </Section>
  );
}

// ---------------- Books ----------------

function BooksSection({
  books,
  onChange,
}: {
  books: BookItem[];
  onChange: (b: BookItem[]) => void;
}) {
  return (
    <Section title="Books (PDF / ePub)">
      <div className="flex flex-col gap-2">
        {books.map((b, i) => (
          <div key={b.id} className={rowClass}>
            <div className="min-w-0 flex-1">
              <input
                className={inputClass}
                value={b.title}
                placeholder="Book title"
                onChange={(e) =>
                  onChange(books.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                }
              />
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="uppercase">{b.format}</span>
                {b.format === "pdf" && (
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={b.printReady ?? false}
                      onChange={(e) =>
                        onChange(
                          books.map((x, j) => (j === i ? { ...x, printReady: e.target.checked } : x)),
                        )
                      }
                    />
                    Print-ready
                  </label>
                )}
                <span className="truncate">{b.url}</span>
              </div>
            </div>
            <button className={removeBtn} onClick={() => onChange(books.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <MediaUploader
          accept="application/pdf,.pdf"
          label="Upload PDF"
          onUploaded={(r) =>
            onChange([
              ...books,
              { id: genId(), title: r.originalFilename, url: r.url, format: "pdf", printReady: true },
            ])
          }
        />
        <MediaUploader
          accept="application/epub+zip,.epub"
          label="Upload ePub"
          onUploaded={(r) =>
            onChange([
              ...books,
              { id: genId(), title: r.originalFilename, url: r.url, format: "epub" },
            ])
          }
        />
      </div>
    </Section>
  );
}

// ---------------- Posters ----------------

function PostersSection({
  posters,
  onChange,
}: {
  posters: PosterItem[];
  onChange: (p: PosterItem[]) => void;
}) {
  return (
    <Section title="Posters (optional)">
      <div className="flex flex-col gap-2">
        {posters.map((p, i) => (
          <div key={p.id} className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
              <input
                className={inputClass}
                value={p.title ?? ""}
                placeholder="Poster title (optional)"
                onChange={(e) =>
                  onChange(posters.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                }
              />
            </div>
            <button className={removeBtn} onClick={() => onChange(posters.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <MediaUploader
          accept="image/*"
          label="Upload poster"
          onUploaded={(r) =>
            onChange([...posters, { id: genId(), title: r.originalFilename, url: r.url }])
          }
        />
      </div>
    </Section>
  );
}

// ---------------- Materials ----------------

function MaterialsSection({
  materials,
  onChange,
}: {
  materials: MaterialItem[];
  onChange: (m: MaterialItem[]) => void;
}) {
  return (
    <Section title="Other materials">
      <div className="flex flex-col gap-2">
        {materials.map((m, i) => (
          <div key={m.id} className={rowClass}>
            <div className="min-w-0 flex-1">
              <input
                className={inputClass}
                value={m.title}
                placeholder="Material title"
                onChange={(e) =>
                  onChange(materials.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                }
              />
              <p className="mt-1 truncate text-xs text-muted-foreground">{m.contentType} · {m.url}</p>
            </div>
            <button
              className={removeBtn}
              onClick={() => onChange(materials.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <MediaUploader
          label="Upload material"
          onUploaded={(r) =>
            onChange([
              ...materials,
              {
                id: genId(),
                title: r.originalFilename,
                url: r.url,
                contentType: r.contentType,
                sizeBytes: r.sizeBytes,
              },
            ])
          }
        />
      </div>
    </Section>
  );
}
