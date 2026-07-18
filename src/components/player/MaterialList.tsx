import type { MaterialItem } from "@/lib/lms/types";
import { FilePreview } from "./FilePreview";

/**
 * Downloadable materials. PDFs/images can be previewed inline (collapsed by
 * default to keep the list light); other file types are download-only.
 */
export function MaterialList({ materials }: { materials: MaterialItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {materials.map((material) => (
        <FilePreview
          key={material.id}
          url={material.url}
          name={material.title}
          contentType={material.contentType}
          sizeBytes={material.sizeBytes}
          startExpanded={false}
        />
      ))}
    </div>
  );
}
