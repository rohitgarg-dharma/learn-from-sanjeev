"use client";

import { useState } from "react";
import type { Attachment, ForumReply } from "@/lib/lms/types";
import { addReply } from "@/lib/community/client";
import { AttachmentComposer } from "./AttachmentComposer";

/** Compose a reply to a thread. */
export function ReplyComposer({
  threadId,
  onAdded,
}: {
  threadId: string;
  onAdded: (reply: ForumReply) => void;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const reply = await addReply(threadId, { body, attachments });
      onAdded(reply);
      setBody("");
      setAttachments([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reply.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        rows={3}
        maxLength={3000}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="mt-3">
        <AttachmentComposer attachments={attachments} onChange={setAttachments} />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button
          onClick={submit}
          disabled={saving || !body.trim()}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-[#8b1717] disabled:opacity-50"
        >
          {saving ? "Posting…" : "Reply"}
        </button>
      </div>
    </div>
  );
}
