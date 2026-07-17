import { getFirebaseAuth } from "@/lib/firebase/client";
import type {
  Attachment,
  ForumReply,
  ForumThread,
  MediaUploadResponse,
  ReplyInput,
  ThreadInput,
  ThreadWithReplies,
} from "@/lib/lms/types";

async function authHeader(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status}).`);
  return data;
}

/** List threads. Pass a courseId to scope to a course, "general" for the
 *  general feed, or nothing for everything. */
export async function fetchThreads(opts?: {
  courseId?: string;
  scope?: "general" | "all";
}): Promise<ForumThread[]> {
  const params = new URLSearchParams();
  if (opts?.courseId) params.set("courseId", opts.courseId);
  else if (opts?.scope) params.set("scope", opts.scope);
  const qs = params.toString();
  const res = await fetch(`/api/community/threads${qs ? `?${qs}` : ""}`, {
    headers: await authHeader(),
  });
  return (await jsonOrThrow(res)).threads ?? [];
}

export async function fetchThread(threadId: string): Promise<ThreadWithReplies> {
  const res = await fetch(`/api/community/threads/${threadId}`, { headers: await authHeader() });
  return jsonOrThrow(res) as Promise<ThreadWithReplies>;
}

export async function createThread(input: ThreadInput): Promise<ForumThread> {
  const res = await fetch("/api/community/threads", {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)).thread as ForumThread;
}

export async function deleteThread(threadId: string): Promise<void> {
  const res = await fetch(`/api/community/threads/${threadId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  await jsonOrThrow(res);
}

export async function addReply(threadId: string, input: ReplyInput): Promise<ForumReply> {
  const res = await fetch(`/api/community/threads/${threadId}/replies`, {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)).reply as ForumReply;
}

export async function deleteReply(threadId: string, replyId: string): Promise<void> {
  const res = await fetch(`/api/community/threads/${threadId}/replies/${replyId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  await jsonOrThrow(res);
}

/** Upload a community attachment; returns the URL + metadata. */
export async function uploadAttachment(file: File): Promise<Attachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/community/upload", {
    method: "POST",
    headers: await authHeader(),
    body: form,
  });
  const r = (await jsonOrThrow(res)) as MediaUploadResponse;
  return { url: r.url, contentType: r.contentType, name: r.originalFilename, sizeBytes: r.sizeBytes };
}
