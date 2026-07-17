"use client";

import { useState } from "react";
import type { VideoItem } from "@/lib/lms/types";
import { videoEmbedUrl } from "@/lib/lms/content";

/** Renders a chapter/course video list: sub-tabs (if multiple) + a player. */
export function VideoRenderer({ videos }: { videos: VideoItem[] }) {
  const [active, setActive] = useState(0);
  const video = videos[active] ?? videos[0];
  if (!video) return null;

  return (
    <div className="flex flex-col gap-4">
      {videos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActive(i)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                i === active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {v.title || `Video ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <SingleVideo video={video} />
      {video.title && <h3 className="text-lg font-semibold">{video.title}</h3>}
      {video.description && (
        <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
          {video.description}
        </p>
      )}
    </div>
  );
}

function SingleVideo({ video }: { video: VideoItem }) {
  const embed = videoEmbedUrl(video);
  if (embed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={embed}
          title={video.title || "Video"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  // Direct/uploaded file.
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video src={video.url} controls className="h-full w-full" preload="metadata" />
    </div>
  );
}
