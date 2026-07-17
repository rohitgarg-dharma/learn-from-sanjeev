"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

/**
 * Renders admin-authored rich text (HTML) for learners. The HTML is sanitized
 * with DOMPurify before it touches the DOM, so even a compromised author can't
 * inject scripts. Returns null when there's nothing meaningful to show.
 */
export function RichText({ html, className = "" }: { html?: string; className?: string }) {
  const clean = useMemo(() => {
    // DOMPurify needs a browser DOM; player data is client-fetched, so skip SSR.
    if (!html || typeof window === "undefined") return "";
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "code", "pre",
        "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "hr", "span",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "style"],
      ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
    });
  }, [html]);

  if (!clean.replace(/<[^>]*>/g, "").trim() && !clean.includes("<hr")) return null;

  return (
    <div
      className={`rich-content text-sm text-foreground ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
