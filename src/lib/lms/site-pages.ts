/**
 * Site-wide informational pages (not per-course). Admins author each as rich
 * text; they surface in the footer on every page and render at /pages/<slug>.
 */
export interface SiteContent {
  contactUs: string;
  terms: string;
  disclaimer: string;
  refund: string;
}

export type SiteContentKey = keyof SiteContent;

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
  contactUs: "",
  terms: "",
  disclaimer: "",
  refund: "",
};
