"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { BlocksEditor } from "@/components/admin/BlocksEditor";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { TeacherSelector } from "@/components/admin/TeacherSelector";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
  fetchCourse,
  updateCourse,
  createSection,
  updateSection,
  deleteSection,
  createChapter,
  updateChapter,
  deleteChapter,
} from "@/lib/lms/client";
import type { Chapter, ChapterBlock, Course, Section } from "@/lib/lms/types";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];

export default function CourseEditorPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  if (!isAdmin) {
    return (
      <div className="min-h-dvh">
        <AppHeader subtitle="Admin" />
        <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-muted-foreground">
          Admins only.
        </main>
      </div>
    );
  }

  return <Editor courseId={courseId} />;
}

function Editor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchCourse(courseId)
      .then(({ course, sections, chapters }) => {
        setCourse(course);
        setSections(sections);
        setChapters(chapters);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [courseId]);

  if (error) {
    return (
      <div className="min-h-dvh">
        <AppHeader subtitle="Course editor" />
        <main className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-sm text-red-600">{error}</p>
          <Link href="/admin" className="mt-4 inline-block text-sm font-medium text-primary underline">
            Back to admin
          </Link>
        </main>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="min-h-dvh">
        <AppHeader subtitle="Course editor" />
        <p className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">
          <span className="animate-pulse">Loading…</span>
        </p>
      </div>
    );
  }

  return (
    <Inner
      key={course.id}
      course={course}
      sections={sections}
      chapters={chapters}
      onCourseChange={setCourse}
      onReload={load}
    />
  );
}

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

/**
 * Primary save button that runs an async action and briefly flips to a green
 * "Saved ✓" confirmation on success before returning to its idle label.
 */
function SaveButton({
  onClick,
  idleLabel = "Save Changes",
  className = "px-4 py-2",
}: {
  onClick: () => Promise<void>;
  idleLabel?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const run = async () => {
    if (status === "saving") return;
    setStatus("saving");
    try {
      await onClick();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  };

  const color =
    status === "saved"
      ? "bg-success text-white"
      : "bg-primary text-primary-foreground hover:bg-[#8b1717]";

  return (
    <button
      onClick={run}
      disabled={status === "saving"}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-60 ${color} ${className}`}
    >
      {status === "saved" && (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : idleLabel}
    </button>
  );
}

function Inner({
  course,
  sections,
  chapters,
  onCourseChange,
  onReload,
}: {
  course: Course;
  sections: Section[];
  chapters: Chapter[];
  onCourseChange: (c: Course) => void;
  onReload: () => void;
}) {
  const courseId = course.id;
  const [tab, setTab] = useState<"about" | "curriculum">("about");

  // About form state (initialized from the loaded course).
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [category, setCategory] = useState(course.category ?? "");
  const [level, setLevel] = useState(course.level ?? "");
  const [tags, setTags] = useState<string[]>(course.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(course.coverImageUrl ?? "");
  const [promoVideoUrl, setPromoVideoUrl] = useState(course.promoVideoUrl ?? "");
  const [aboutContent, setAboutContent] = useState(course.aboutContent ?? "");
  const [teacherIds, setTeacherIds] = useState<string[]>(course.teacherIds ?? []);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };

  const saveAbout = async () => {
    const updated = await updateCourse(courseId, {
      title,
      description,
      category,
      level,
      tags,
      teacherIds,
      coverImageUrl,
      promoVideoUrl,
      aboutContent,
    });
    onCourseChange(updated);
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const updated = await updateCourse(courseId, { isPublished: !course.isPublished });
      onCourseChange(updated);
    } finally {
      setPublishing(false);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(courseId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Sticky editor header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent"
            aria-label="Back to admin"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold">{course.title || "Untitled course"}</h1>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                Course
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  course.isPublished ? "bg-success/15 text-success" : "bg-progress/15 text-progress"
                }`}
              >
                {course.isPublished ? "Published" : "Draft"}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">Manage course content and settings</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/courses/${courseId}`}
              className="hidden rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent sm:inline-block"
            >
              Preview
            </Link>
            <button
              onClick={togglePublish}
              disabled={publishing}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
            >
              {course.isPublished ? "Unpublish" : "Publish"}
            </button>
            <SaveButton onClick={saveAbout} className="px-4 py-1.5" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <nav className="flex gap-1">
            {(["about", "curriculum"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "about" ? "About" : "Curriculum"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {tab === "about" ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">Course Settings</h2>
            <p className="mb-5 text-sm text-muted-foreground">Basic information about your course</p>

            <div className="flex flex-col gap-5">
              {/* Course ID */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Course ID</span>
                <div className="flex items-center gap-2">
                  <code className="truncate rounded-md bg-muted px-2 py-1 text-xs">{courseId}</code>
                  <button
                    onClick={copyId}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium transition hover:bg-accent"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  Title <span className="text-primary">*</span>
                </span>
                <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Short Description</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">
                  This appears in course listings and previews.
                </span>
              </label>

              {/* Tags */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Tags</span>
                <div className="flex gap-2">
                  <input
                    className={fieldClass}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="e.g. vedic-math, beginner"
                  />
                  <button
                    onClick={addTag}
                    className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-accent"
                  >
                    + Add
                  </button>
                </div>
                {tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-saffron px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {tag}
                        <button
                          onClick={() => setTags(tags.filter((t) => t !== tag))}
                          className="text-primary/60 hover:text-primary"
                          aria-label={`Remove ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No tags added yet.</span>
                )}
              </div>

              {/* Teachers */}
              <TeacherSelector selectedIds={teacherIds} onChange={setTeacherIds} />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    Level <span className="text-primary">*</span>
                  </span>
                  <select className={fieldClass} value={level} onChange={(e) => setLevel(e.target.value)}>
                    <option value="">Select a level</option>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    Category <span className="text-primary">*</span>
                  </span>
                  <input
                    className={fieldClass}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Grammar"
                  />
                </label>
              </div>

              {/* Banner image */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Banner Image URL</span>
                <input
                  className={fieldClass}
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://…"
                />
                <div className="mt-1 flex items-center gap-3">
                  {coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImageUrl} alt="" className="h-14 w-24 rounded-lg object-cover" />
                  )}
                  <MediaUploader
                    accept="image/*"
                    label={coverImageUrl ? "Replace" : "Upload banner"}
                    onUploaded={(r) => setCoverImageUrl(r.url)}
                  />
                  {coverImageUrl && (
                    <button
                      onClick={() => setCoverImageUrl("")}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">About Course Video URL</span>
                <input
                  className={fieldClass}
                  value={promoVideoUrl}
                  onChange={(e) => setPromoVideoUrl(e.target.value)}
                  placeholder="https://youtu.be/…"
                />
                <span className="text-xs text-muted-foreground">
                  Optional. Shown in the “About Course” section on the learner course page.
                </span>
              </label>

              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">About This Course</span>
                <RichTextEditor
                  value={aboutContent}
                  onChange={setAboutContent}
                  placeholder="Detailed description shown to learners. Use headings, bullet lists, links and more."
                />
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <SaveButton onClick={saveAbout} className="px-4 py-2" />
              </div>
            </div>
          </div>
        ) : (
          <CurriculumTab
            courseId={courseId}
            course={course}
            sections={sections}
            chapters={chapters}
            onCourseChange={onCourseChange}
            onReload={onReload}
          />
        )}
      </main>
    </div>
  );
}

// ---------------- Curriculum tab ----------------

function CurriculumTab({
  courseId,
  course,
  sections,
  chapters,
  onCourseChange,
  onReload,
}: {
  courseId: string;
  course: Course;
  sections: Section[];
  chapters: Chapter[];
  onCourseChange: (c: Course) => void;
  onReload: () => void;
}) {
  const addSection = async () => {
    await createSection(courseId, {
      title: `Section ${sections.length + 1}`,
      sortOrder: sections.length,
    });
    onReload();
  };

  const moveSection = async (index: number, dir: -1 | 1) => {
    const current = sections[index];
    const neighbour = sections[index + dir];
    if (!current || !neighbour) return;
    await Promise.all([
      updateSection(courseId, current.id, { sortOrder: neighbour.sortOrder }),
      updateSection(courseId, neighbour.id, { sortOrder: current.sortOrder }),
    ]);
    onReload();
  };

  const addChapter = async (sectionId: string | null) => {
    const group = chapters.filter((c) => (c.sectionId ?? null) === sectionId);
    const nextOrder = chapters.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;
    await createChapter(courseId, {
      title: `Chapter ${group.length + 1}`,
      sectionId,
      sortOrder: nextOrder,
    });
    onReload();
  };

  const moveChapter = async (group: Chapter[], index: number, dir: -1 | 1) => {
    const current = group[index];
    const neighbour = group[index + dir];
    if (!current || !neighbour) return;
    await Promise.all([
      updateChapter(courseId, current.id, { sortOrder: neighbour.sortOrder }),
      updateChapter(courseId, neighbour.id, { sortOrder: current.sortOrder }),
    ]);
    onReload();
  };

  const chaptersOf = (sectionId: string | null) =>
    chapters.filter((c) => (c.sectionId ?? null) === sectionId);
  const ungrouped = chaptersOf(null);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Course-level materials</h2>
        <CourseContentEditor course={course} onSaved={onCourseChange} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sections &amp; chapters</h2>
          <button
            onClick={addSection}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-[#8b1717]"
          >
            Add section
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {sections.length === 0 && ungrouped.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No sections yet. Add a section to group your chapters.
            </p>
          )}

          {sections.map((section, i) => {
            const group = chaptersOf(section.id);
            return (
              <SectionCard
                key={section.id}
                courseId={courseId}
                section={section}
                index={i}
                total={sections.length}
                sections={sections}
                chapters={group}
                onMoveSection={moveSection}
                onMoveChapter={(idx, dir) => moveChapter(group, idx, dir)}
                onAddChapter={() => addChapter(section.id)}
                onChanged={onReload}
              />
            );
          })}

          {ungrouped.length > 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Ungrouped chapters
                </h3>
                <button
                  onClick={() => addChapter(null)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
                >
                  Add chapter
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {ungrouped.map((chapter, i) => (
                  <ChapterCard
                    key={chapter.id}
                    courseId={courseId}
                    chapter={chapter}
                    index={i}
                    total={ungrouped.length}
                    sections={sections}
                    onMove={(idx, dir) => moveChapter(ungrouped, idx, dir)}
                    onChanged={onReload}
                  />
                ))}
              </div>
            </div>
          )}

          {sections.length > 0 && ungrouped.length === 0 && (
            <button
              onClick={() => addChapter(null)}
              className="self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent"
            >
              + Add an ungrouped chapter
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function CourseContentEditor({
  course,
  onSaved,
}: {
  course: Course;
  onSaved: (c: Course) => void;
}) {
  const [buckets, setBuckets] = useState({
    videos: course.videos,
    books: course.books,
    posters: course.posters,
    materials: course.materials,
  });

  const save = async () => {
    const updated = await updateCourse(course.id, buckets);
    onSaved(updated);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <ContentEditor buckets={buckets} onChange={setBuckets} />
      <div className="mt-4">
        <SaveButton onClick={save} idleLabel="Save course materials" />
      </div>
    </div>
  );
}

function SectionCard({
  courseId,
  section,
  index,
  total,
  sections,
  chapters,
  onMoveSection,
  onMoveChapter,
  onAddChapter,
  onChanged,
}: {
  courseId: string;
  section: Section;
  index: number;
  total: number;
  sections: Section[];
  chapters: Chapter[];
  onMoveSection: (index: number, dir: -1 | 1) => void;
  onMoveChapter: (index: number, dir: -1 | 1) => void;
  onAddChapter: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? "");

  const save = async () => {
    await updateSection(courseId, section.id, { title, description });
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    await deleteSection(courseId, section.id);
    onChanged();
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{section.title}</h3>
            {section.description && (
              <p className="truncate text-xs text-muted-foreground">{section.description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onMoveSection(index, -1)}
            disabled={index === 0}
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent disabled:opacity-30"
            aria-label="Move section up"
          >
            ↑
          </button>
          <button
            onClick={() => onMoveSection(index, 1)}
            disabled={index === total - 1}
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent disabled:opacity-30"
            aria-label="Move section down"
          >
            ↓
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
          >
            {editing ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Section title</span>
            <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Description</span>
            <input
              className={fieldClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <SaveButton onClick={save} idleLabel="Save section" />
            <button
              onClick={remove}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete section
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4">
        {chapters.length === 0 && (
          <p className="text-sm text-muted-foreground">No chapters in this section yet.</p>
        )}
        {chapters.map((chapter, i) => (
          <ChapterCard
            key={chapter.id}
            courseId={courseId}
            chapter={chapter}
            index={i}
            total={chapters.length}
            sections={sections}
            onMove={onMoveChapter}
            onChanged={onChanged}
          />
        ))}
        <button
          onClick={onAddChapter}
          className="self-start rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
        >
          Add chapter
        </button>
      </div>
    </div>
  );
}

function ChapterCard({
  courseId,
  chapter,
  index,
  total,
  sections,
  onMove,
  onChanged,
}: {
  courseId: string;
  chapter: Chapter;
  index: number;
  total: number;
  sections: Section[];
  onMove: (index: number, dir: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [description, setDescription] = useState(chapter.description ?? "");
  const [sectionId, setSectionId] = useState<string | null>(chapter.sectionId ?? null);
  const [isPublished, setIsPublished] = useState(chapter.isPublished);
  const [blocks, setBlocks] = useState<ChapterBlock[]>(chapter.blocks ?? []);
  const [buckets, setBuckets] = useState({
    videos: chapter.videos,
    books: chapter.books,
    posters: chapter.posters,
    materials: chapter.materials,
  });

  const save = async () => {
    await updateChapter(courseId, chapter.id, {
      title,
      description,
      sectionId,
      isPublished,
      blocks,
      ...buckets,
    });
    onChanged();
  };

  const remove = async () => {
    await deleteChapter(courseId, chapter.id);
    onChanged();
  };

  return (
    <div className="rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-2 p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron text-xs font-medium text-primary">
            {index + 1}
          </span>
          <span className="min-w-0 truncate font-medium">{chapter.title}</span>
          {!chapter.isPublished && (
            <span className="shrink-0 rounded-full bg-progress/15 px-2 py-0.5 text-xs font-medium text-progress">
              Draft
            </span>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
          >
            {open ? "Collapse" : "Edit"}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Title</span>
            <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Description</span>
            <textarea
              className={fieldClass}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Section</span>
            <select
              className={fieldClass}
              value={sectionId ?? ""}
              onChange={(e) => setSectionId(e.target.value || null)}
            >
              <option value="">Ungrouped</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            <span className="text-sm font-medium">Published</span>
          </label>

          <BlocksEditor blocks={blocks} onChange={setBlocks} />

          <ContentEditor buckets={buckets} onChange={setBuckets} />

          <div className="flex items-center gap-2">
            <SaveButton onClick={save} idleLabel="Save chapter" />
            <button
              onClick={remove}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete chapter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
