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
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await uploadMedia(file);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
