"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { ThreadComposer } from "@/components/community/ThreadComposer";
import { ThreadCard } from "@/components/community/ThreadCard";
import { fetchThreads } from "@/lib/community/client";
import type { ForumThread } from "@/lib/lms/types";

export default function CommunityPage() {
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
      <Suspense fallback={null}>
        <Feed />
      </Suspense>
    </div>
  );
}

function Feed() {
  const params = useSearchParams();
  const courseId = params.get("courseId") ?? undefined;

  const [threads, setThreads] = useState<ForumThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchThreads(courseId ? { courseId } : { scope: "all" })
      .then(setThreads)
      .catch((e) => setError(e.message));
  };
  useEffect(load, [courseId]);

  const courseTitle = threads?.find((t) => t.courseId === courseId)?.courseTitle;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">
          {courseId ? "Course Q&A" : "Community"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {courseId
            ? `Ask and answer questions${courseTitle ? ` about ${courseTitle}` : " about this course"}.`
            : "Ask questions and help others across all courses."}
        </p>
      </div>

      <ThreadComposer
        courseId={courseId}
        onCreated={(t) => setThreads((prev) => [t, ...(prev ?? [])])}
      />

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex flex-col gap-3">
        {!threads && !error && (
          <p className="text-sm text-muted-foreground">
            <span className="animate-pulse">Loading questions…</span>
          </p>
        )}
        {threads && threads.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-saffron">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="font-semibold">No questions yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to start a discussion.</p>
          </div>
        )}
        {threads?.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} showCourse={!courseId} />
        ))}
      </div>
    </main>
  );
}
