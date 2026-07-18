"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { AppHeader } from "@/components/AppHeader";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import { MediaUploader } from "@/components/admin/MediaUploader";
import {
  fetchTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from "@/lib/lms/client";
import type { Teacher } from "@/lib/lms/types";

export default function TeachersPage() {
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

  return (
    <div className="min-h-dvh">
      <AppHeader subtitle="Admin" />
      <TeachersManager />
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

function TeachersManager() {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Teacher | "new" | null>(null);

  const load = () => {
    fetchTeachers().then(setTeachers).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const remove = async (t: Teacher) => {
    if (!confirm(`Delete ${t.name}? They will be removed from any assigned courses.`)) return;
    await deleteTeacher(t.id);
    load();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
          >
            ← Admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Teachers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add Acharyas and assign them to courses from the course editor.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-[#8b1717]"
        >
          + Add teacher
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!teachers && !error && (
        <p className="text-sm text-muted-foreground">
          <span className="animate-pulse">Loading…</span>
        </p>
      )}

      {teachers && teachers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="font-semibold">No teachers yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first teacher to feature them on courses.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teachers?.map((t) => (
          <div
            key={t.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <TeacherAvatar name={t.name} photoUrl={t.photoUrl} size={56} />
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{t.name}</h3>
                {t.title && <p className="truncate text-xs text-muted-foreground">{t.title}</p>}
              </div>
            </div>
            {t.bio && (
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{t.bio}</p>
            )}
            <div className="mt-4 flex items-center gap-2 pt-1">
              <button
                onClick={() => setEditing(t)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
              >
                Edit
              </button>
              <button
                onClick={() => remove(t)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <TeacherDialog
          teacher={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </main>
  );
}

function TeacherDialog({
  teacher,
  onClose,
  onSaved,
}: {
  teacher: Teacher | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(teacher?.name ?? "");
  const [title, setTitle] = useState(teacher?.title ?? "");
  const [bio, setBio] = useState(teacher?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(teacher?.photoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { name, title, bio, photoUrl };
      if (teacher) await updateTeacher(teacher.id, input);
      else await createTeacher(input);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{teacher ? "Edit teacher" : "Add teacher"}</h2>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <TeacherAvatar name={name || "?"} photoUrl={photoUrl} size={72} />
            <div className="flex flex-col items-start gap-1.5">
              <MediaUploader
                accept="image/*"
                label={photoUrl ? "Replace photo" : "Upload photo"}
                onUploaded={(r) => setPhotoUrl(r.url)}
              />
              {photoUrl && (
                <button
                  onClick={() => setPhotoUrl("")}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              Name <span className="text-primary">*</span>
            </span>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acharya Sanjeev Newar"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Title / role</span>
            <input
              className={fieldClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Founder & Lead Acharya"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Description</span>
            <textarea
              className={fieldClass}
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short biography or introduction shown to learners."
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-[#8b1717] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save teacher"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
