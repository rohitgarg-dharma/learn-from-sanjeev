"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { ContentTabs } from "@/components/player/ContentTabs";
import { fetchCourse } from "@/lib/lms/client";
import { hasAnyContent } from "@/lib/lms/content";
import type { Chapter, ContentBuckets, Course } from "@/lib/lms/types";

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
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
      <AppHeader subtitle="Course" />
      <Player courseId={courseId} />
    </div>
  );
}

/** A selectable item in the curriculum: the course overview or a chapter. */
type Selection = { kind: "overview" } | { kind: "chapter"; id: string };

function Player({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const courseHasContent = course ? hasAnyContent(course) : false;
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    fetchCourse(courseId)
      .then(({ course, chapters }) => {
        setCourse(course);
        setChapters(chapters);
        setSelection(
          hasAnyContent(course)
            ? { kind: "overview" }
            : chapters[0]
              ? { kind: "chapter", id: chapters[0].id }
              : { kind: "overview" },
        );
      })
      .catch((e) => setError(e.message));
  }, [courseId]);

  const activeBuckets: ContentBuckets | null = useMemo(() => {
    if (!course || !selection) return null;
    if (selection.kind === "overview") return course;
    return chapters.find((c) => c.id === selection.id) ?? null;
  }, [course, chapters, selection]);

  const activeTitle =
    selection?.kind === "chapter"
      ? chapters.find((c) => c.id === selection.id)?.title
      : "Course materials";

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to courses
        </Link>
      </main>
    );
  }

  if (!course) {
    return (
      <p className="mx-auto max-w-6xl px-6 py-16 text-sm text-muted-foreground">
        <span className="animate-pulse">Loading course…</span>
      </p>
    );
  }

  const select = (s: Selection) => {
    setSelection(s);
    setSidebarOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[288px_1fr]">
      {/* Mobile: toggle for the curriculum drawer */}
      <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
        <h1 className="truncate text-lg font-bold">{course.title}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/community?courseId=${courseId}`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
          >
            Discussion
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-saffron"
          >
            Chapters
          </button>
        </div>
      </div>

      {/* Sidebar (static on desktop, drawer on mobile) */}
      <Sidebar
        course={course}
        chapters={chapters}
        courseHasContent={courseHasContent}
        selection={selection}
        onSelect={select}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Content */}
      <main className="min-w-0">
        <div className="mb-4 hidden items-start justify-between gap-4 lg:flex">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
            {course.description && (
              <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
            )}
          </div>
          <Link
            href={`/community?courseId=${courseId}`}
            className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition hover:border-primary/40 hover:bg-saffron/40"
          >
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Discussion
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] sm:p-6">
          {activeTitle && (
            <h2 className="mb-4 text-lg font-bold">
              <span className="text-primary">{activeTitle}</span>
            </h2>
          )}
          {activeBuckets ? (
            <ContentTabs buckets={activeBuckets} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a chapter to begin.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  course,
  chapters,
  courseHasContent,
  selection,
  onSelect,
  open,
  onClose,
}: {
  course: Course;
  chapters: Chapter[];
  courseHasContent: boolean;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  open: boolean;
  onClose: () => void;
}) {
  const list = (
    <nav className="flex flex-col gap-1">
      {courseHasContent && (
        <ItemButton
          active={selection?.kind === "overview"}
          onClick={() => onSelect({ kind: "overview" })}
          label="Course materials"
          index={null}
        />
      )}
      {chapters.map((chapter, i) => (
        <ItemButton
          key={chapter.id}
          active={selection?.kind === "chapter" && selection.id === chapter.id}
          onClick={() => onSelect({ kind: "chapter", id: chapter.id })}
          label={chapter.title}
          index={i + 1}
        />
      ))}
      {chapters.length === 0 && !courseHasContent && (
        <p className="px-3 py-4 text-sm text-muted-foreground">No chapters yet.</p>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-20 hidden h-fit rounded-2xl border border-border bg-card p-3 shadow-sm lg:block">
        <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Curriculum
        </p>
        {list}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="truncate text-sm font-bold text-primary">{course.title}</span>
              <button onClick={onClose} className="text-sm text-muted-foreground">
                Close
              </button>
            </div>
            {list}
          </aside>
        </div>
      )}
    </>
  );
}

function ItemButton({
  active,
  onClick,
  label,
  index,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  index: number | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors ${
        active
          ? "border-primary bg-saffron-strong font-semibold text-foreground shadow-[0_2px_8px_rgba(167,28,28,0.12)]"
          : "border-transparent hover:bg-saffron"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {index ?? "★"}
      </span>
      <span className="min-w-0 truncate font-medium">{label}</span>
    </button>
  );
}
