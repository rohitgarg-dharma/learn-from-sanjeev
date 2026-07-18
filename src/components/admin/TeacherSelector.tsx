"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import { fetchTeachers } from "@/lib/lms/client";
import type { Teacher } from "@/lib/lms/types";

/**
 * Multi-select for assigning teachers (Acharyas) to a course. Fully controlled:
 * emits the updated id array via onChange. A course can have many teachers.
 */
export function TeacherSelector({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchTeachers()
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, []);

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  const selected = (teachers ?? []).filter((t) => selectedIds.includes(t.id));
  const filtered = (teachers ?? []).filter((t) =>
    t.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Teachers</span>
        <Link href="/admin/teachers" className="text-xs font-medium text-primary hover:underline">
          Manage teachers
        </Link>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-saffron py-0.5 pl-0.5 pr-2 text-xs font-medium text-primary"
            >
              <TeacherAvatar name={t.name} photoUrl={t.photoUrl} size={20} />
              {t.name}
              <button
                onClick={() => toggle(t.id)}
                className="text-primary/60 hover:text-primary"
                aria-label={`Remove ${t.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {teachers === null ? (
        <p className="text-xs text-muted-foreground">
          <span className="animate-pulse">Loading teachers…</span>
        </p>
      ) : teachers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          No teachers yet.{" "}
          <Link href="/admin/teachers" className="font-medium text-primary hover:underline">
            Add one
          </Link>{" "}
          to assign it here.
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          {teachers.length > 6 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teachers…"
              className="w-full rounded-t-lg border-b border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.map((t) => {
              const checked = selectedIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition ${
                    checked ? "bg-saffron/60" : "hover:bg-accent"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {checked && (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <TeacherAvatar name={t.name} photoUrl={t.photoUrl} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.name}</span>
                    {t.title && (
                      <span className="block truncate text-xs text-muted-foreground">{t.title}</span>
                    )}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">No matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
