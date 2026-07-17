import type { ContentBuckets, VideoItem } from "@/lib/lms/types";

/** A content tab key. Order defines display order; "posters" is optional. */
export type TabKey = "videos" | "books" | "posters" | "materials";

export const TAB_LABELS: Record<TabKey, string> = {
  videos: "Videos",
  books: "Books",
  posters: "Posters",
  materials: "Other materials",
};

export const TAB_ORDER: TabKey[] = ["videos", "books", "posters", "materials"];

/** Tabs that actually have content, in display order (empty ones are hidden). */
export function nonEmptyTabs(buckets: ContentBuckets): TabKey[] {
  return TAB_ORDER.filter((key) => (buckets[key]?.length ?? 0) > 0);
}

export function hasAnyContent(buckets: ContentBuckets): boolean {
  return nonEmptyTabs(buckets).length > 0;
}

/**
 * Derive an embeddable URL for a video item. YouTube/Vimeo get their embed
 * form; "file" videos are played with a native <video> element (url returned
 * as-is by the caller).
 */
export function videoEmbedUrl(video: VideoItem): string | null {
  const url = video.url.trim();
  if (video.provider === "youtube") {
    const id = parseYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (video.provider === "vimeo") {
    const id = parseVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

/** Best-effort provider detection from a pasted URL. */
export function detectProvider(url: string): VideoItem["provider"] {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  return "file";
}

function parseYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  return m ? m[1] : null;
}

function parseVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
