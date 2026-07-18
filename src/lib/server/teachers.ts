import "server-only";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Teacher, TeacherInput } from "@/lib/lms/types";

/**
 * Server-only data access (Admin SDK) for teachers ("Acharyas"). Teachers are a
 * top-level entity so they can be reused across courses:
 *
 *   lms_teachers/{teacherId}
 *
 * Courses reference them by id (`course.teacherIds`), a many-to-many link.
 */
const TEACHERS = "lms_teachers";

function ms(ts: unknown): number | null {
  return ts instanceof Object && "toMillis" in ts ? (ts as Timestamp).toMillis() : null;
}

function teachersCol() {
  return adminDb.collection(TEACHERS);
}

function toTeacher(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): Teacher {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: data.name ?? "",
    title: data.title ?? undefined,
    bio: data.bio ?? undefined,
    photoUrl: data.photoUrl ?? undefined,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
  };
}

export async function listTeachers(): Promise<Teacher[]> {
  const snap = await teachersCol().orderBy("name", "asc").get();
  return snap.docs.map(toTeacher);
}

export async function getTeacher(teacherId: string): Promise<Teacher | null> {
  const doc = await teachersCol().doc(teacherId).get();
  return doc.exists ? toTeacher(doc) : null;
}

/**
 * Resolve a list of teacher ids into full records, preserving the given order
 * and silently dropping ids that no longer exist.
 */
export async function getTeachersByIds(ids: string[]): Promise<Teacher[]> {
  const clean = [...new Set((ids ?? []).filter((id) => typeof id === "string" && id))];
  if (clean.length === 0) return [];
  const docs = await Promise.all(clean.map((id) => teachersCol().doc(id).get()));
  const byId = new Map<string, Teacher>();
  docs.forEach((d) => {
    if (d.exists) byId.set(d.id, toTeacher(d));
  });
  return clean.map((id) => byId.get(id)).filter((t): t is Teacher => t !== undefined);
}

export async function createTeacher(input: TeacherInput): Promise<Teacher> {
  const now = FieldValue.serverTimestamp();
  const ref = await teachersCol().add({
    name: (input.name ?? "Unnamed teacher").trim().slice(0, 200),
    title: input.title?.trim().slice(0, 200) || null,
    bio: input.bio?.slice(0, 4000) || null,
    photoUrl: input.photoUrl || null,
    createdAt: now,
    updatedAt: now,
  });
  return toTeacher(await ref.get());
}

export async function updateTeacher(teacherId: string, input: TeacherInput): Promise<Teacher | null> {
  const ref = teachersCol().doc(teacherId);
  if (!(await ref.get()).exists) return null;
  const patch: FirebaseFirestore.DocumentData = { updatedAt: FieldValue.serverTimestamp() };
  if (input.name !== undefined) patch.name = input.name.trim().slice(0, 200);
  if (input.title !== undefined) patch.title = input.title.trim().slice(0, 200) || null;
  if (input.bio !== undefined) patch.bio = input.bio.slice(0, 4000) || null;
  if (input.photoUrl !== undefined) patch.photoUrl = input.photoUrl || null;
  await ref.update(patch);
  return getTeacher(teacherId);
}

/**
 * Delete a teacher and remove the id from every course that referenced it, so
 * no course is left pointing at a missing teacher.
 */
export async function deleteTeacher(teacherId: string): Promise<void> {
  const referencing = await adminDb
    .collection("lms_courses")
    .where("teacherIds", "array-contains", teacherId)
    .get();
  const batch = adminDb.batch();
  referencing.forEach((c) =>
    batch.update(c.ref, { teacherIds: FieldValue.arrayRemove(teacherId) }),
  );
  batch.delete(teachersCol().doc(teacherId));
  await batch.commit();
}
