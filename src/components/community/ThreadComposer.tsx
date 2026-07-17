"use client";

import { useState } from "react";
import type { Attachment, ForumThread } from "@/lib/lms/types";
import { createThread } from "@/lib/community/client";
import { AttachmentComposer } from "./AttachmentComposer";

/** Compose a new question. When collapsed it shows a prompt; expands to a form. */
export function ThreadComposer({
  courseId,
  onCreated,
}: {
  courseId?: string;
  onCreated: (thread: ForumThread) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setAttachments([]);
    setError(null);
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Add a title and a question.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const thread = await createThread({ courseId: courseId ?? null, title, body, attachments });
      onCreated(thread);
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-border bg-card p-4 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-saffron/30"
      >
        Ask a question{courseId ? " about this course" : ""}…
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Question title"
        maxLength={200}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe your question. Add details, context, or what you've tried."
        rows={4}
        maxLength={5000}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="mt-3">
        <AttachmentComposer attachments={attachments} onChange={setAttachments} />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-[#8b1717] disabled:opacity-50"
        >
          {saving ? "Posting…" : "Post question"}
        </button>
      </div>
    </div>
  );
}
