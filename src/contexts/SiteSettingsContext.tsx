"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSiteContent } from "@/lib/lms/client";
import {
  DEFAULT_SITE_TITLE,
  resolveSiteTitle,
  type SiteContent,
} from "@/lib/lms/site-pages";

interface SiteSettings {
  /** Full site content (pages + title); null until first load. */
  content: SiteContent | null;
  /** Effective site title (configured value or the default). */
  siteTitle: string;
  /** Re-fetch after an admin saves changes. */
  refresh: () => void;
}

const SiteSettingsContext = createContext<SiteSettings>({
  content: null,
  siteTitle: DEFAULT_SITE_TITLE,
  refresh: () => {},
});

/**
 * Loads the site's configurable settings/content once and shares them app-wide
 * (header brand, footer, browser tab title) to avoid duplicate fetches.
 */
export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent | null>(null);

  const refresh = useCallback(() => {
    fetchSiteContent()
      .then(setContent)
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  const siteTitle = resolveSiteTitle(content);

  // Keep the browser tab title in sync with the configured site title.
  useEffect(() => {
    if (content) document.title = siteTitle;
  }, [content, siteTitle]);

  return (
    <SiteSettingsContext.Provider value={{ content, siteTitle, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}
