"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { MediaUploader } from "@/components/admin/MediaUploader";
import {
  fetchCourse,
  updateCourse,
  createChapter,
  updateChapter,
  deleteChapter,
} from "@/lib/lms/client";
import type { Chapter, Course } from "@/lib/lms/types";

export default function CourseEditorPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  if (!isAdmin) {
    return (
      <div className="min-h-dvh">
        <AppHeader subtitle="Admin" />
        <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-neutral-500">
          Admins only.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <AppHeader subtitle="Course editor" />
      <Editor courseId={courseId} />
    </div>
  );
}

function Editor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchCourse(courseId)
      .then(({ course, chapters }) => {
        setCourse(course);
        setChapters(chapters);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [courseId]);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm text-red-500">{error}</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-medium underline">
          Back to admin
        </Link>
      </main>
    );
  }
  if (!course) {
    return <p className="mx-auto max-w-4xl px-6 py-16 text-sm text-neutral-500">Loading…</p>;
  }

  const addChapter = async () => {
    await createChapter(courseId, {
      title: `Chapter ${chapters.length + 1}`,
      sortOrder: chapters.length,
    });
    load();
  };

  // Swap this chapter's sortOrder with its neighbour and persist both.
  const moveChapter = async (index: number, dir: -1 | 1) => {
    const neighbour = chapters[index + dir];
    const current = chapters[index];
    if (!neighbour || !current) return;
    await Promise.all([
      updateChapter(courseId, current.id, { sortOrder: neighbour.sortOrder }),
      updateChapter(courseId, neighbour.id, { sortOrder: current.sortOrder }),
    ]);
    load();
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm font-medium text-neutral-500 hover:underline">
          ← All courses
        </Link>
        <Link href={`/courses/${courseId}`} className="text-sm font-medium underline">
          Preview
        </Link>
      </div>

      <CourseMetaEditor course={course} onSaved={setCourse} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Course-level materials</h2>
        <CourseContentEditor course={course} onSaved={setCourse} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chapters</h2>
          <button
            onClick={addChapter}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Add chapter
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {chapters.length === 0 && (
            <p className="text-sm text-neutral-500">No chapters yet.</p>
          )}
          {chapters.map((chapter, i) => (
            <ChapterCard
              key={chapter.id}
              courseId={courseId}
              chapter={chapter}
              index={i}
              total={chapters.length}
              onMove={moveChapter}
              onChanged={load}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

const fieldClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function CourseMetaEditor({
  course,
  onSaved,
}: {
  course: Course;
  onSaved: (c: Course) => void;
}) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [category, setCategory] = useState(course.category ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(course.coverImageUrl ?? "");
  const [isPublished, setIsPublished] = useState(course.isPublished);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateCourse(course.id, {
        title,
        description,
        category,
        coverImageUrl,
        isPublished,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-neutral-200 p-4 sm:p-6 dark:border-neutral-800">
      <h2 className="mb-4 text-lg font-semibold">Course details</h2>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Title</span>
          <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Description</span>
          <textarea
            className={fieldClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Category</span>
            <input
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Cover image</span>
            <div className="flex items-center gap-3">
              {coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImageUrl} alt="" className="h-10 w-16 rounded object-cover" />
              )}
              <MediaUploader
                accept="image/*"
                label={coverImageUrl ? "Replace" : "Upload cover"}
                onUploaded={(r) => setCoverImageUrl(r.url)}
              />
              {coverImageUrl && (
                <button
                  onClick={() => setCoverImageUrl("")}
                  className="text-sm text-neutral-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <span className="text-sm font-medium">Published</span>
        </label>
        <div>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </div>
      </div>
    </section>
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
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateCourse(course.id, buckets);
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 sm:p-6 dark:border-neutral-800">
      <ContentEditor buckets={buckets} onChange={setBuckets} />
      <button
        onClick={save}
        disabled={saving}
        className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {saving ? "Saving…" : "Save course materials"}
      </button>
    </div>
  );
}

function ChapterCard({
  courseId,
  chapter,
  index,
  total,
  onMove,
  onChanged,
}: {
  courseId: string;
  chapter: Chapter;
  index: number;
  total: number;
  onMove: (index: number, dir: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [description, setDescription] = useState(chapter.description ?? "");
  const [isPublished, setIsPublished] = useState(chapter.isPublished);
  const [buckets, setBuckets] = useState({
    videos: chapter.videos,
    books: chapter.books,
    posters: chapter.posters,
    materials: chapter.materials,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateChapter(courseId, chapter.id, { title, description, isPublished, ...buckets });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${chapter.title}"?`)) return;
    await deleteChapter(courseId, chapter.id);
    onChanged();
  };

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs dark:bg-neutral-800">
            {index + 1}
          </span>
          <span className="min-w-0 truncate font-medium">{chapter.title}</span>
          {!chapter.isPublished && (
            <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Draft
            </span>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            className="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700"
          >
            {open ? "Collapse" : "Edit"}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-neutral-200 p-4 dark:border-neutral-800">
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            <span className="text-sm font-medium">Published</span>
          </label>

          <ContentEditor buckets={buckets} onChange={setBuckets} />

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {saving ? "Saving…" : "Save chapter"}
            </button>
            <button
              onClick={remove}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Delete chapter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
