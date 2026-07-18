"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { ContentTabs } from "@/components/player/ContentTabs";
import { BlockRenderer } from "@/components/player/BlockRenderer";
import { fetchCourse, fetchProgress, markChapterComplete } from "@/lib/lms/client";
import { hasAnyContent } from "@/lib/lms/content";
import type { Chapter, ContentBuckets, Course, Section } from "@/lib/lms/types";

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

/**
 * What the main pane shows: the curriculum list (default landing), the
 * course-level materials overview, or a specific chapter's content.
 */
type Selection = { kind: "curriculum" } | { kind: "overview" } | { kind: "chapter"; id: string };

function Player({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const courseHasContent = course ? hasAnyContent(course) : false;
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    fetchCourse(courseId)
      .then(({ course, sections, chapters }) => {
        setCourse(course);
        setSections(sections);
        setChapters(chapters);
        // Open straight into the learning view: the sidebar already IS the
        // curriculum, so land on the first chapter (with its content in the
        // right panel) rather than an extra curriculum landing screen.
        if (chapters.length > 0) setSelection({ kind: "chapter", id: chapters[0].id });
        else if (hasAnyContent(course)) setSelection({ kind: "overview" });
        else setSelection({ kind: "curriculum" });
      })
      .catch((e) => setError(e.message));
  }, [courseId]);

  useEffect(() => {
    fetchProgress(courseId)
      .then((ids) => setCompleted(new Set(ids)))
      .catch(() => {});
  }, [courseId]);

  /** Persist completion (optimistic), reconciling with the server's set. */
  const applyCompletion = (chapterId: string, isDone: boolean) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (isDone) next.add(chapterId);
      else next.delete(chapterId);
      return next;
    });
    markChapterComplete(courseId, chapterId, isDone)
      .then((ids) => setCompleted(new Set(ids)))
      .catch(() => {});
  };

  const activeBuckets: ContentBuckets | null = useMemo(() => {
    if (!course || !selection) return null;
    if (selection.kind === "overview") return course;
    if (selection.kind === "chapter") return chapters.find((c) => c.id === selection.id) ?? null;
    return null;
  }, [course, chapters, selection]);

  const activeChapter =
    selection?.kind === "chapter" ? chapters.find((c) => c.id === selection.id) ?? null : null;

  const activeTitle =
    selection?.kind === "chapter"
      ? chapters.find((c) => c.id === selection.id)?.title
      : selection?.kind === "overview"
        ? "Course materials"
        : "Curriculum";

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
    // Completion is explicit (the "Mark as complete" toggle) — merely navigating
    // between chapters must never mark them done.
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
        sections={sections}
        chapters={chapters}
        completed={completed}
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
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {selection?.kind !== "curriculum" && (
                <button
                  onClick={() => select({ kind: "curriculum" })}
                  className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  ← Curriculum
                </button>
              )}
              {activeTitle && (
                <h2 className="text-lg font-bold">
                  <span className="text-primary">{activeTitle}</span>
                </h2>
              )}
            </div>
            {selection?.kind === "chapter" && (
              <CompleteToggle
                done={completed.has(selection.id)}
                onToggle={() =>
                  applyCompletion(selection.id, !completed.has(selection.id))
                }
              />
            )}
          </div>
          {selection?.kind === "curriculum" ? (
            <CurriculumList
              sections={sections}
              chapters={chapters}
              completed={completed}
              courseHasContent={courseHasContent}
              onSelect={select}
            />
          ) : (
            (() => {
              const hasBlocks = (activeChapter?.blocks?.length ?? 0) > 0;
              const hasBuckets = !!activeBuckets && hasAnyContent(activeBuckets);
              if (!hasBlocks && !hasBuckets) {
                return (
                  <p className="text-sm text-muted-foreground">
                    No content in this section yet.
                  </p>
                );
              }
              return (
                <div className="flex flex-col gap-6">
                  {hasBlocks && <BlockRenderer blocks={activeChapter!.blocks} />}
                  {hasBuckets && <ContentTabs buckets={activeBuckets!} />}
                </div>
              );
            })()
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * The Gurukula-style course landing: lessons (sections) with chapter rows,
 * each showing a description and a Completed/Start status. This is what a
 * learner sees first after opening a course.
 */
function CurriculumList({
  sections,
  chapters,
  completed,
  courseHasContent,
  onSelect,
}: {
  sections: Section[];
  chapters: Chapter[];
  completed: Set<string>;
  courseHasContent: boolean;
  onSelect: (s: Selection) => void;
}) {
  const numberOf = (id: string) => chapters.findIndex((c) => c.id === id) + 1;
  const row = (chapter: Chapter) => (
    <CurriculumRow
      key={chapter.id}
      chapter={chapter}
      index={numberOf(chapter.id)}
      done={completed.has(chapter.id)}
      onOpen={() => onSelect({ kind: "chapter", id: chapter.id })}
    />
  );

  const usedSections = sections.filter((s) => chapters.some((c) => c.sectionId === s.id));
  const ungrouped = chapters.filter((c) => !c.sectionId);

  if (chapters.length === 0 && !courseHasContent) {
    return <p className="text-sm text-muted-foreground">No chapters yet. Check back soon.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {courseHasContent && (
        <button
          onClick={() => onSelect({ kind: "overview" })}
          className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition hover:bg-saffron/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-saffron text-primary">
            <FolderIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Course materials</span>
            <span className="block text-xs text-muted-foreground">
              Books, posters and other resources for the whole course
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-primary">Open</span>
        </button>
      )}

      {usedSections.map((section) => {
        const own = chapters.filter((c) => c.sectionId === section.id);
        return (
          <LessonGroup key={section.id} title={section.title} count={own.length}>
            {own.map(row)}
          </LessonGroup>
        );
      })}

      {ungrouped.length > 0 &&
        (usedSections.length > 0 ? (
          <LessonGroup title="Other chapters" count={ungrouped.length}>
            {ungrouped.map(row)}
          </LessonGroup>
        ) : (
          <LessonGroup title="Chapters" count={ungrouped.length}>{ungrouped.map(row)}</LessonGroup>
        ))}
    </div>
  );
}

/** A collapsible "lesson" card grouping a section's chapter rows. */
function LessonGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 bg-secondary/50 px-4 py-3 text-left transition hover:bg-secondary"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground">
            {count} chapter{count === 1 ? "" : "s"}
          </span>
        </span>
        <span
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ⌄
        </span>
      </button>
      {open && <div className="divide-y divide-border">{children}</div>}
    </div>
  );
}

/** A single chapter row in the curriculum list. */
function CurriculumRow({
  chapter,
  index,
  done,
  onOpen,
}: {
  chapter: Chapter;
  index: number;
  done: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-saffron/40"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
          done ? "bg-success/15 text-success" : "bg-saffron text-primary"
        }`}
      >
        {done ? <CheckIcon /> : <PlayIcon />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {index}. {chapter.title}
        </span>
        {chapter.description && (
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
            {chapter.description}
          </span>
        )}
      </span>
      <span className="shrink-0">
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <CheckIcon />
            Completed
          </span>
        ) : (
          <span className="text-sm font-semibold text-primary">Start</span>
        )}
      </span>
    </button>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function Sidebar({
  course,
  sections,
  chapters,
  completed,
  courseHasContent,
  selection,
  onSelect,
  open,
  onClose,
}: {
  course: Course;
  sections: Section[];
  chapters: Chapter[];
  completed: Set<string>;
  courseHasContent: boolean;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  open: boolean;
  onClose: () => void;
}) {
  // A stable chapter number based on the flat ordered chapter list.
  const numberOf = (id: string) => chapters.findIndex((c) => c.id === id) + 1;

  const completedCount = chapters.filter((c) => completed.has(c.id)).length;
  const pct = chapters.length ? Math.round((completedCount / chapters.length) * 100) : 0;

  const ungrouped = chapters.filter((c) => !c.sectionId);
  const chapterButton = (chapter: Chapter) => (
    <ItemButton
      key={chapter.id}
      active={selection?.kind === "chapter" && selection.id === chapter.id}
      onClick={() => onSelect({ kind: "chapter", id: chapter.id })}
      label={chapter.title}
      index={numberOf(chapter.id)}
      done={completed.has(chapter.id)}
    />
  );

  const list = (
    <nav className="flex flex-col gap-1">
      {chapters.length > 0 && (
        <div className="mb-2 px-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              {completedCount}/{chapters.length} chapters
            </span>
            <span className="font-semibold text-primary">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      <ItemButton
        active={selection?.kind === "curriculum"}
        onClick={() => onSelect({ kind: "curriculum" })}
        label="Curriculum"
        index={null}
      />

      {courseHasContent && (
        <ItemButton
          active={selection?.kind === "overview"}
          onClick={() => onSelect({ kind: "overview" })}
          label="Course materials"
          index={null}
        />
      )}

      {sections.map((section) => {
        const own = chapters.filter((c) => c.sectionId === section.id);
        if (own.length === 0) return null;
        return (
          <SectionGroup
            key={section.id}
            title={section.title}
            activeInside={own.some((c) => selection?.kind === "chapter" && selection.id === c.id)}
          >
            {own.map(chapterButton)}
          </SectionGroup>
        );
      })}

      {ungrouped.length > 0 &&
        (sections.length > 0 ? (
          <SectionGroup
            title="Other chapters"
            activeInside={ungrouped.some(
              (c) => selection?.kind === "chapter" && selection.id === c.id,
            )}
          >
            {ungrouped.map(chapterButton)}
          </SectionGroup>
        ) : (
          ungrouped.map(chapterButton)
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

/** A collapsible section header with its chapter rows underneath. */
function SectionGroup({
  title,
  activeInside,
  children,
}: {
  title: string;
  activeInside: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:bg-saffron"
      >
        <span
          className={`transition-transform ${open ? "rotate-90" : ""} ${activeInside ? "text-primary" : ""}`}
          aria-hidden
        >
          ▸
        </span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </button>
      {open && <div className="mt-1 flex flex-col gap-1 pl-2">{children}</div>}
    </div>
  );
}

function ItemButton({
  active,
  onClick,
  label,
  index,
  done,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  index: number | null;
  done?: boolean;
}) {
  const circle = done
    ? "bg-success text-white"
    : active
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground";
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
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${circle}`}
      >
        {done ? <CheckIcon /> : (index ?? "★")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {done && (
          <span className="block text-xs font-medium text-success">Completed</span>
        )}
      </span>
    </button>
  );
}

/** A pill that shows a chapter's completion state and lets the learner toggle it. */
function CompleteToggle({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        done
          ? "border-success/40 bg-success/10 text-success hover:bg-success/20"
          : "border-primary/40 text-primary hover:bg-saffron"
      }`}
    >
      {done ? (
        <>
          <CheckIcon />
          Completed
        </>
      ) : (
        "Mark as complete"
      )}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
