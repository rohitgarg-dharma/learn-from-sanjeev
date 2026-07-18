"use client";

import { useRef, useState } from "react";
import { uploadMedia } from "@/lib/lms/client";
import type { MediaUploadResponse } from "@/lib/lms/types";

/** Uploads a file to Storage and returns its URL + metadata via onUploaded. */
export function MediaUploader({
  accept,
  label = "Upload file",
  onUploaded,
}: {
  accept?: string;
  label?: string;
  onUploaded: (result: MediaUploadResponse) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const result = await uploadMedia(file, setProgress);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const pct = Math.round(progress * 100);

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
      >
        {busy ? (pct > 0 ? `Uploading… ${pct}%` : "Starting…") : label}
      </button>
      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-150"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
