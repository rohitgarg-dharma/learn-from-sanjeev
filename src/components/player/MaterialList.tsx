import type { MaterialItem } from "@/lib/lms/types";

function formatSize(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/** A simple list of downloadable material cards. */
export function MaterialList({ materials }: { materials: MaterialItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {materials.map((material) => {
        const size = formatSize(material.sizeBytes);
        return (
          <li key={material.id}>
            <a
              href={material.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <svg
                  className="h-5 w-5 shrink-0 text-neutral-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{material.title}</span>
                  {(material.contentType || size) && (
                    <span className="block truncate text-xs text-neutral-500">
                      {[material.contentType, size].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
              </div>
              <span className="shrink-0 text-sm font-medium text-neutral-500">Download</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
