"use client";

import { useEffect, useState } from "react";
import type { Attachment, Chapter, Course, ForumThread, Section } from "@/lib/lms/types";
import { createThread } from "@/lib/community/client";
import { fetchCourse, fetchCourses } from "@/lib/lms/client";
import { AttachmentComposer } from "./AttachmentComposer";

const selectClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

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

  // Course → section (lesson) → chapter targeting.
  const [courses, setCourses] = useState<Course[]>([]);
  const [selCourse, setSelCourse] = useState<string>(courseId ?? "");
  const [sections, setSections] = useState<Section[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selSection, setSelSection] = useState<string>("");
  const [selChapter, setSelChapter] = useState<string>("");

  // Load the course list once the composer is opened.
  useEffect(() => {
    if (!open || courses.length) return;
    fetchCourses()
      .then(setCourses)
      .catch(() => {});
  }, [open, courses.length]);

  // Load the selected course's structure (sections + chapters) for targeting.
  useEffect(() => {
    setSelSection("");
    setSelChapter("");
    setSections([]);
    setChapters([]);
    if (!selCourse) return;
    let active = true;
    fetchCourse(selCourse)
      .then(({ sections, chapters }) => {
        if (!active) return;
        setSections(sections);
        setChapters(chapters);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selCourse]);

  const reset = () => {
    setTitle("");
    setBody("");
    setAttachments([]);
    setError(null);
    setSelCourse(courseId ?? "");
    setSelSection("");
    setSelChapter("");
  };

  // Sections that actually contain chapters, and chapters within the chosen
  // section (or all course chapters when no section is picked).
  const usedSections = sections.filter((s) => chapters.some((c) => c.sectionId === s.id));
  const chapterChoices = selSection
    ? chapters.filter((c) => c.sectionId === selSection)
    : chapters;

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Add a title and a question.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const thread = await createThread({
        courseId: selCourse || null,
        sectionId: selSection || null,
        chapterId: selChapter || null,
        title,
        body,
        attachments,
      });
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
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Course</span>
          <select
            value={selCourse}
            onChange={(e) => setSelCourse(e.target.value)}
            className={selectClass}
          >
            <option value="">General (no course)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Lesson (section)</span>
          <select
            value={selSection}
            onChange={(e) => {
              setSelSection(e.target.value);
              setSelChapter("");
            }}
            disabled={!selCourse || usedSections.length === 0}
            className={`${selectClass} disabled:opacity-50`}
          >
            <option value="">All / not specific</option>
            {usedSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Chapter</span>
          <select
            value={selChapter}
            onChange={(e) => setSelChapter(e.target.value)}
            disabled={!selCourse || chapterChoices.length === 0}
            className={`${selectClass} disabled:opacity-50`}
          >
            <option value="">Not specific</option>
            {chapterChoices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>

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
