/**
 * Site-wide informational pages (not per-course). Admins author each as rich
 * text; they surface in the footer on every page and render at /pages/<slug>.
 */
export interface SiteContent {
  /** Site / brand name shown in the header, footer and browser tab. */
  siteTitle: string;
  contactUs: string;
  terms: string;
  disclaimer: string;
  refund: string;
}

/** Rich-text page keys (excludes the plain-text siteTitle). */
export type SiteContentKey = "contactUs" | "terms" | "disclaimer" | "refund";

/** Shown when no custom site title has been configured. */
export const DEFAULT_SITE_TITLE = "Learn from Sanjeev";

/** Effective site title, falling back to the default when unset. */
export function resolveSiteTitle(content?: Pick<SiteContent, "siteTitle"> | null): string {
  return content?.siteTitle?.trim() || DEFAULT_SITE_TITLE;
}

export interface SitePage {
  slug: string;
  label: string;
  key: SiteContentKey;
}

/** Order defines footer + admin display order. */
export const SITE_PAGES: SitePage[] = [
  { slug: "contact-us", label: "Contact Us", key: "contactUs" },
  { slug: "terms", label: "Terms & Conditions", key: "terms" },
  { slug: "disclaimer", label: "Disclaimer", key: "disclaimer" },
  { slug: "refund-cancellation", label: "Refund & Cancellation", key: "refund" },
];

export const EMPTY_SITE_CONTENT: SiteContent = {
  siteTitle: "",
  contactUs: "",
  terms: "",
  disclaimer: "",
  refund: "",
};
