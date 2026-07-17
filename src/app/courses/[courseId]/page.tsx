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
      <div className="flex min-h-dvh items-center justify-center text-sm text-neutral-500">
        Loading…
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
        <p className="text-sm text-red-500">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium underline">
          Back to courses
        </Link>
      </main>
    );
  }

  if (!course) {
    return <p className="mx-auto max-w-6xl px-6 py-16 text-sm text-neutral-500">Loading course…</p>;
  }

  const select = (s: Selection) => {
    setSelection(s);
    setSidebarOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[280px_1fr]">
      {/* Mobile: toggle for the curriculum drawer */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <h1 className="truncate text-lg font-semibold">{course.title}</h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700"
        >
          Chapters
        </button>
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
        <div className="mb-4 hidden lg:block">
          <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
          {course.description && (
            <p className="mt-1 text-sm text-neutral-500">{course.description}</p>
          )}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
          {activeTitle && <h2 className="mb-4 text-lg font-semibold">{activeTitle}</h2>}
          {activeBuckets ? (
            <ContentTabs buckets={activeBuckets} />
          ) : (
            <p className="text-sm text-neutral-500">Select a chapter to begin.</p>
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
        <p className="px-3 py-4 text-sm text-neutral-500">No chapters yet.</p>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-20 hidden h-fit rounded-2xl border border-neutral-200 bg-white p-3 lg:block dark:border-neutral-800 dark:bg-neutral-900">
        <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {course.title}
        </p>
        {list}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-4 shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Chapters</span>
              <button onClick={onClose} className="text-sm text-neutral-500">
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
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
          active
            ? "bg-white/20 dark:bg-neutral-900/20"
            : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
        }`}
      >
        {index ?? "★"}
      </span>
      <span className="min-w-0 truncate font-medium">{label}</span>
    </button>
  );
}
