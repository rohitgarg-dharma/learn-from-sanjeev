"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { Avatar } from "@/components/community/Avatar";
import { AttachmentList } from "@/components/community/AttachmentList";
import { ReplyComposer } from "@/components/community/ReplyComposer";
import { fetchThread, deleteThread, deleteReply } from "@/lib/community/client";
import { timeAgo } from "@/lib/community/format";
import type { ForumReply, ForumThread } from "@/lib/lms/types";

export default function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-dvh">
      <AppHeader subtitle="Community" />
      <ThreadDetail threadId={threadId} />
    </div>
  );
}

function ThreadDetail({ threadId }: { threadId: string }) {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchThread(threadId)
      .then(({ thread, replies }) => {
        setThread(thread);
        setReplies(replies);
      })
      .catch((e) => setError(e.message));
  }, [threadId]);

  const canManage = (authorUid: string) => isAdmin || user?.uid === authorUid;

  const removeThread = async () => {
    if (!confirm("Delete this question and all replies?")) return;
    await deleteThread(threadId);
    router.push(thread?.courseId ? `/community?courseId=${thread.courseId}` : "/community");
  };

  const removeReply = async (replyId: string) => {
    if (!confirm("Delete this reply?")) return;
    await deleteReply(threadId, replyId);
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  };

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/community" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to community
        </Link>
      </main>
    );
  }
  if (!thread) {
    return (
      <p className="mx-auto max-w-3xl px-6 py-16 text-sm text-muted-foreground">
        <span className="animate-pulse">Loading…</span>
      </p>
    );
  }

  const backHref = thread.courseId ? `/community?courseId=${thread.courseId}` : "/community";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href={backHref} className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline">
        ← Community
      </Link>

      {/* Question */}
      <article className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <Avatar name={thread.authorName} photo={thread.authorPhoto} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{thread.authorName}</p>
            <p className="text-xs text-muted-foreground">{timeAgo(thread.createdAt)}</p>
          </div>
          {thread.courseTitle && (
            <span className="ml-auto shrink-0 rounded-full bg-saffron px-2.5 py-0.5 text-xs font-medium text-primary">
              {thread.courseTitle}
            </span>
          )}
          {canManage(thread.authorUid) && (
            <button
              onClick={removeThread}
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>

        <h1 className="mt-4 text-xl font-bold leading-snug">{thread.title}</h1>
        {(thread.sectionTitle || thread.chapterTitle) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {[thread.courseTitle, thread.sectionTitle, thread.chapterTitle]
              .filter(Boolean)
              .join(" › ")}
          </p>
        )}
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{thread.body}</p>

        {thread.attachments.length > 0 && (
          <div className="mt-4">
            <AttachmentList attachments={thread.attachments} />
          </div>
        )}
      </article>

      {/* Replies */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {replies.length} {replies.length === 1 ? "reply" : "replies"}
      </h2>
      <div className="flex flex-col gap-3">
        {replies.map((reply) => (
          <div key={reply.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar name={reply.authorName} photo={reply.authorPhoto} size={32} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{reply.authorName}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</p>
              </div>
              {canManage(reply.authorUid) && (
                <button
                  onClick={() => removeReply(reply.id)}
                  className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{reply.body}</p>
            {reply.attachments.length > 0 && (
              <div className="mt-3">
                <AttachmentList attachments={reply.attachments} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ReplyComposer threadId={threadId} onAdded={(r) => setReplies((prev) => [...prev, r])} />
      </div>
    </main>
  );
}
