"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import {
  fetchCourses,
  fetchAdminStats,
  createCourse,
  updateCourse,
  deleteCourse,
} from "@/lib/lms/client";
import type { AdminStats, Course } from "@/lib/lms/types";

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

// ---------------- Inline icons (mirroring lucide) ----------------

type IconProps = { className?: string };
const Book = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const Plus = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5v14" />
  </svg>
);
const Chat = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const FileText = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);
const Check = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);
const Arrow = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

// ---------------- Card primitives (shadcn-like) ----------------

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function AdminDashboard() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = () => {
    fetchCourses().then(setCourses).catch((e) => setError(e.message));
    fetchAdminStats().then(setStats).catch(() => {});
  };
  useEffect(load, []);

  const handleCreate = async () => {
    const title = newTitle.trim() || "Untitled course";
    setCreating(true);
    setError(null);
    try {
      await createCourse({ title });
      setNewTitle("");
      setShowCreate(false);
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
    if (!confirm(`Delete "${course.title}" and all its sections & chapters?`)) return;
    await deleteCourse(course.id);
    load();
  };

  const statCards = [
    { label: "Total Courses", value: stats?.totalCourses },
    { label: "Published", value: stats?.publishedCourses },
    { label: "Drafts", value: stats?.draftCourses },
    { label: "Sections", value: stats?.totalSections },
    { label: "Chapters", value: stats?.totalChapters },
    { label: "Community Q&A", value: stats?.communityThreads },
  ];

  const actionRows = [
    {
      label: "Draft courses to publish",
      count: stats?.draftCourses ?? 0,
      href: "#courses",
      icon: FileText,
    },
    {
      label: "Unanswered community questions",
      count: stats?.unansweredThreads ?? 0,
      href: "/community",
      icon: Chat,
    },
  ];
  const actionTotal = actionRows.reduce((n, r) => n + r.count, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your Sanjeev LMS content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label} className="p-6">
            <p className="truncate text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-3xl font-bold">
              {s.value ?? <span className="animate-pulse text-muted-foreground">–</span>}
            </p>
          </Card>
        ))}
      </div>

      {/* My Upcoming Tasks */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold">My Upcoming Tasks</h2>
        <div className="mt-2 flex items-center gap-2 text-success">
          <Check className="h-5 w-5" />
          <span className="font-medium">All caught up!</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">No pending tasks.</p>
      </Card>

      {/* Pending Action Items */}
      <Card>
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-semibold">Pending Action Items</h2>
          {actionTotal > 0 && (
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-sm font-semibold text-white">
              {actionTotal}
            </span>
          )}
        </div>
        <div className="px-5 pb-4 pt-2">
          {actionTotal === 0 ? (
            <div className="flex items-center gap-2 py-1 text-success">
              <Check className="h-5 w-5" />
              <span className="font-medium">All caught up!</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {actionRows.map((row) => (
                <Link
                  key={row.label}
                  href={row.href}
                  className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <row.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-sm">{row.label}</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      row.count > 0 ? "text-progress" : "text-muted-foreground"
                    }`}
                  >
                    {row.count}
                  </span>
                  <Arrow className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <p className="text-sm text-muted-foreground">Common tasks to manage your content</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-[#8b1717]"
          >
            <Plus className="h-4 w-4" />
            Create Course
          </button>
          <Link
            href="/community"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <Chat className="h-4 w-4" />
            View Community
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <Book className="h-4 w-4" />
            Preview site
          </Link>
        </div>

        {showCreate && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New course title"
              autoFocus
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
        )}
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Recent Courses */}
      <section id="courses" className="scroll-mt-20">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Courses</h2>
            <p className="text-sm text-muted-foreground">Your latest course content</p>
          </div>
        </div>

        <div className="space-y-5">
          {!courses && !error && (
            <p className="text-sm text-muted-foreground">
              <span className="animate-pulse">Loading…</span>
            </p>
          )}
          {courses?.length === 0 && (
            <Card className="py-8">
              <p className="text-center text-sm text-muted-foreground">
                Create your first course to get started.
              </p>
            </Card>
          )}
          {courses?.map((course) => (
            <AdminCourseCard
              key={course.id}
              course={course}
              onTogglePublish={togglePublish}
              onRemove={remove}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminCourseCard({
  course,
  onTogglePublish,
  onRemove,
}: {
  course: Course;
  onTogglePublish: (c: Course) => void;
  onRemove: (c: Course) => void;
}) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="flex flex-col sm:flex-row">
        {/* Left — cover */}
        <Link
          href={`/admin/courses/${course.id}`}
          className="relative block shrink-0 overflow-hidden bg-muted sm:w-56 md:w-72"
        >
          {course.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.coverImageUrl}
              alt={course.title}
              className="h-full min-h-[120px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center bg-gradient-to-br from-saffron to-saffron-strong">
              <Book className="h-10 w-10 text-primary/40" />
            </div>
          )}
          <div className="absolute left-2.5 top-2.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-md ${
                course.isPublished ? "bg-success" : "bg-progress"
              }`}
            >
              {course.isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </Link>

        {/* Right — content */}
        <div className="flex flex-1 flex-col p-4 md:p-5">
          {course.category && (
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {course.category}
              </span>
            </div>
          )}

          <Link href={`/admin/courses/${course.id}`} className="block">
            <h3 className="mb-1 line-clamp-1 text-lg font-bold transition-colors group-hover:text-primary">
              {course.title}
            </h3>
          </Link>

          {course.description && (
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
          )}

          <div className="flex-1" />

          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            <Link
              href={`/admin/courses/${course.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
            >
              Edit <Arrow className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => onTogglePublish(course)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
            >
              {course.isPublished ? "Unpublish" : "Publish"}
            </button>
            <button
              onClick={() => onRemove(course)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
