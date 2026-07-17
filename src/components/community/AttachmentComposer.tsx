"use client";

import { useRef, useState } from "react";
import type { Attachment } from "@/lib/lms/types";
import { uploadAttachment } from "@/lib/community/client";
import { formatSize } from "@/lib/community/format";

const MAX_FILES = 6;

/** Lets the user attach files: uploads immediately on select and shows a
 *  preview (image thumbnail or file chip) with a remove button. */
export function AttachmentComposer({
  attachments,
  onChange,
}: {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (!files.length) return;
    const room = MAX_FILES - attachments.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX_FILES} files.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded: Attachment[] = [];
      for (const file of files.slice(0, room)) {
        uploaded.push(await uploadAttachment(file));
      }
      onChange([...attachments, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div
              key={`${a.url}-${i}`}
              className="relative flex items-center gap-2 rounded-lg border border-border bg-background p-2 pr-8"
            >
              {a.contentType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded bg-secondary text-primary">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </span>
              )}
              <span className="min-w-0 max-w-[9rem]">
                <span className="block truncate text-xs font-medium">{a.name}</span>
                <span className="block text-[10px] text-muted-foreground">{formatSize(a.sizeBytes)}</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(attachments.filter((_, j) => j !== i))}
                aria-label="Remove attachment"
                className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || attachments.length >= MAX_FILES}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          {busy ? "Uploading…" : "Attach files"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt,.ppt,.pptx"
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}
