"use client";

import { useCallback, useRef } from "react";

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/**
 * Attach `ref` to an element and call `toggle()` to enter/exit the browser's
 * native fullscreen for it. Includes a WebKit (Safari) fallback.
 */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const toggle = useCallback(() => {
    const el = ref.current as FsElement | null;
    if (!el) return;
    const doc = document as FsDocument;
    const inFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (inFullscreen) {
      (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
    } else {
      (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
    }
  }, []);

  return { ref, toggle };
}
