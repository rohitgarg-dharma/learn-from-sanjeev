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
        <main className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to ritvijam.com accounts.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
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
      <h1 className="text-2xl font-bold tracking-tight">Manage courses</h1>

      <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New course title"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-[#8b1717] disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create course"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-2">
        {!courses && !error && (
          <p className="text-sm text-muted-foreground">
            <span className="animate-pulse">Loading…</span>
          </p>
        )}
        {courses?.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No courses yet. Create your first one above.
          </p>
        )}
        {courses?.map((course) => (
          <div
            key={course.id}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-semibold">{course.title}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    course.isPublished
                      ? "bg-success/15 text-success"
                      : "bg-progress/15 text-progress"
                  }`}
                >
                  {course.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              {course.description && (
                <p className="truncate text-sm text-muted-foreground">{course.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/admin/courses/${course.id}`}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
              >
                Edit
              </Link>
              <button
                onClick={() => togglePublish(course)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
              >
                {course.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={() => remove(course)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
