"use client";

import Link from "next/link";
import type { ForumThread } from "@/lib/lms/types";
import { timeAgo } from "@/lib/community/format";
import { Avatar } from "./Avatar";
import { AttachmentThumbs } from "./AttachmentList";

/** A thread summary card in the community feed. */
export function ThreadCard({ thread, showCourse }: { thread: ForumThread; showCourse?: boolean }) {
  return (
    <Link
      href={`/community/${thread.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:p-5"
    >
      <div className="flex items-center gap-3">
        <Avatar name={thread.authorName} photo={thread.authorPhoto} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{thread.authorName}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(thread.createdAt)}</p>
        </div>
        {showCourse && thread.courseTitle && (
          <span className="ml-auto shrink-0 rounded-full bg-saffron px-2.5 py-0.5 text-xs font-medium text-primary">
            {thread.courseTitle}
          </span>
        )}
        {showCourse && !thread.courseId && (
          <span className="ml-auto shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            General
          </span>
        )}
      </div>

      <h3 className="mt-3 font-semibold leading-snug">{thread.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{thread.body}</p>

      {thread.attachments.length > 0 && (
        <div className="mt-3">
          <AttachmentThumbs attachments={thread.attachments} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
      </div>
    </Link>
  );
}
