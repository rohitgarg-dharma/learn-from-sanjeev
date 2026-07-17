"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { fetchCourses, createCourse, updateCourse, deleteCourse } from "@/lib/lms/client";
import type { Course } from "@/lib/lms/types";

export default function AdminPage() {
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
        <main className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-neutral-500">
            This area is restricted to ritvijam.com accounts.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium underline">
            Back to courses
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <AppHeader subtitle="Admin" />
      <AdminDashboard />
    </div>
  );
}

function AdminDashboard() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = () => {
    fetchCourses()
      .then(setCourses)
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    const title = newTitle.trim() || "Untitled course";
    setCreating(true);
    setError(null);
    try {
      await createCourse({ title });
      setNewTitle("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create course.");
    } finally {
      setCreating(false);
    }
  };

  const togglePublish = async (course: Course) => {
    await updateCourse(course.id, { isPublished: !course.isPublished });
    load();
  };

  const remove = async (course: Course) => {
    if (!confirm(`Delete "${course.title}" and all its chapters?`)) return;
    await deleteCourse(course.id);
    load();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Manage courses</h1>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center dark:border-neutral-800">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New course title"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {creating ? "Creating…" : "Create course"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <div className="mt-6 flex flex-col gap-2">
        {!courses && !error && <p className="text-sm text-neutral-500">Loading…</p>}
        {courses?.length === 0 && (
          <p className="text-sm text-neutral-500">No courses yet. Create your first one above.</p>
        )}
        {courses?.map((course) => (
          <div
            key={course.id}
            className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-medium">{course.title}</h2>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    course.isPublished
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {course.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              {course.description && (
                <p className="truncate text-sm text-neutral-500">{course.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/admin/courses/${course.id}`}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Edit
              </Link>
              <button
                onClick={() => togglePublish(course)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {course.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button onClick={() => remove(course)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
