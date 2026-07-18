import { TeacherAvatar } from "@/components/TeacherAvatar";
import type { Teacher } from "@/lib/lms/types";

/**
 * Learner-facing "Acharyas" card listing the teachers assigned to a course.
 * Set `headingHidden` when the caller renders its own section heading above.
 */
export function CourseTeachers({
  teachers,
  headingHidden = false,
}: {
  teachers: Teacher[];
  headingHidden?: boolean;
}) {
  if (teachers.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      {!headingHidden && (
        <h3 className="mb-4 text-lg font-semibold">
          {teachers.length > 1 ? "Acharyas" : "Acharya"}
        </h3>
      )}
      <div className="flex flex-col gap-5">
        {teachers.map((t) => (
          <div key={t.id} className="flex items-start gap-4">
            <TeacherAvatar name={t.name} photoUrl={t.photoUrl} size={64} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.name}</p>
              {t.title && <p className="text-sm text-muted-foreground">{t.title}</p>}
              {t.bio && (
                <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{t.bio}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
