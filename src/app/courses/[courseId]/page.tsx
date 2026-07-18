"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { CourseTeachers } from "@/components/course/CourseTeachers";
import { RichText } from "@/components/RichText";
import { fetchCourse, fetchProgress } from "@/lib/lms/client";
import { detectProvider, hasAnyContent, videoEmbedUrl } from "@/lib/lms/content";
import type { Chapter, Course, Section, Teacher } from "@/lib/lms/types";

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
      <Landing courseId={courseId} />
    </div>
  );
}

function Landing({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourse(courseId)
      .then(({ course, sections, chapters, teachers }) => {
        setCourse(course);
        setSections(sections);
        setChapters(chapters);
        setTeachers(teachers ?? []);
      })
      .catch((e) => setError(e.message));
  }, [courseId]);

  useEffect(() => {
    fetchProgress(courseId)
      .then((ids) => setCompleted(new Set(ids)))
      .catch(() => {});
  }, [courseId]);

  const completedCount = chapters.filter((c) => completed.has(c.id)).length;
  const pct = chapters.length ? Math.round((completedCount / chapters.length) * 100) : 0;
  const started = completedCount > 0;

  // Where the primary CTA sends the learner: the first not-yet-completed
  // chapter (resume), or the first chapter otherwise.
  const targetChapter = useMemo(() => {
    const next = chapters.find((c) => !completed.has(c.id));
    return next ?? chapters[0] ?? null;
  }, [chapters, completed]);

  const learnHref = targetChapter
    ? `/courses/${courseId}/learn?chapter=${targetChapter.id}`
    : `/courses/${courseId}/learn`;

  // `aboutContent` is now authored as rich text (HTML). Older courses may still
  // hold plain text with one bullet per line — detect and render those as a list.
  const about = course?.aboutContent ?? "";
  const aboutIsHtml = /<[a-z][\s\S]*>/i.test(about);
  const aboutLines = about
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const hasAbout = aboutIsHtml ? about.trim().length > 0 : aboutLines.length > 0;

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

  const courseHasContent = hasAnyContent(course);
  const promoEmbed = course.promoVideoUrl
    ? videoEmbedUrl({
        id: "promo",
        title: course.title,
        url: course.promoVideoUrl,
        provider: detectProvider(course.promoVideoUrl),
      })
    : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
      >
        ← All courses
      </Link>

      {/* Hero */}
      <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {course.category && (
                <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {course.category}
                </span>
              )}
              {course.level && (
                <span className="rounded-full bg-saffron px-2.5 py-0.5 text-xs font-medium text-primary">
                  {course.level}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{course.title}</h1>
            {course.description && (
              <p className="text-sm text-muted-foreground sm:text-base">{course.description}</p>
            )}

            {course.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {course.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <BookIcon />
                {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
              </span>
              {sections.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <LayersIcon />
                  {sections.length} section{sections.length === 1 ? "" : "s"}
                </span>
              )}
              {teachers.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon />
                  {teachers.length === 1 ? teachers[0].name : `${teachers.length} teachers`}
                </span>
              )}
            </div>

            {chapters.length > 0 && started && (
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">
                    {completedCount}/{chapters.length} completed
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

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                href={learnHref}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-[#8b1717]"
              >
                <PlayIcon />
                {started ? "Continue learning" : "Start learning"}
              </Link>
              <Link
                href={`/community?courseId=${courseId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:border-primary/40 hover:bg-saffron/40"
              >
                <ChatIcon />
                Discussion
              </Link>
            </div>
          </div>

          {/* Cover / promo */}
          <div className="relative min-h-[200px] bg-gradient-to-br from-saffron to-muted">
            {course.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.coverImageUrl}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary/30">
                <span className="scale-[3]">
                  <BookIcon />
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-6">
        {/* About this course — the heading is a section label kept separate
            from the content, with the video and description in their own cards. */}
        {(course.promoVideoUrl || hasAbout) && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">About this course</h2>

            {course.promoVideoUrl && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                  {promoEmbed ? (
                    <iframe
                      src={promoEmbed}
                      title={course.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={course.promoVideoUrl} controls className="h-full w-full" preload="metadata" />
                  )}
                </div>
              </div>
            )}

            {hasAbout && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                {aboutIsHtml ? (
                  <RichText html={about} />
                ) : aboutLines.length === 1 ? (
                  <p className="text-sm text-muted-foreground">{aboutLines[0]}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {aboutLines.map((line, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

          {/* Curriculum */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Curriculum</h2>
            <CurriculumPreview
              courseId={courseId}
              sections={sections}
              chapters={chapters}
              completed={completed}
              courseHasContent={courseHasContent}
              learnHref={`/courses/${courseId}/learn`}
            />
          </section>

          {/* Teachers, shown below the curriculum */}
          {teachers.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">
                {teachers.length > 1 ? "Acharyas" : "Acharya"}
              </h2>
              <CourseTeachers teachers={teachers} headingHidden />
            </section>
          )}
        </div>
      </main>
  );
}

function CurriculumPreview({
  courseId,
  sections,
  chapters,
  completed,
  courseHasContent,
  learnHref,
}: {
  courseId: string;
  sections: Section[];
  chapters: Chapter[];
  completed: Set<string>;
  courseHasContent: boolean;
  learnHref: string;
}) {
  const numberOf = (id: string) => chapters.findIndex((c) => c.id === id) + 1;
  const usedSections = sections.filter((s) => chapters.some((c) => c.sectionId === s.id));
  const ungrouped = chapters.filter((c) => !c.sectionId);

  const row = (chapter: Chapter) => (
    <ChapterRow
      key={chapter.id}
      chapter={chapter}
      index={numberOf(chapter.id)}
      done={completed.has(chapter.id)}
      href={`/courses/${courseId}/learn?chapter=${chapter.id}`}
    />
  );

  if (chapters.length === 0 && !courseHasContent) {
    return <p className="text-sm text-muted-foreground">No chapters yet. Check back soon.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
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

      {courseHasContent && (
        <Link
          href={`${learnHref}`}
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
        </Link>
      )}
    </div>
  );
}

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

function ChapterRow({
  chapter,
  index,
  done,
  href,
}: {
  chapter: Chapter;
  index: number;
  done: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
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
    </Link>
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

function BookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m12 2 9 5-9 5-9-5 9-5z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
