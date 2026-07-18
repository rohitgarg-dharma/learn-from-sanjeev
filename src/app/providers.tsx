"use client";

import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { getFirebaseAnalytics } from "@/lib/firebase/client";

export function Providers({ children }: { children: ReactNode }) {
  // Initialize Firebase Analytics (GA4) once, in the browser. The helper
  // no-ops during SSR and where Analytics isn't supported.
  useEffect(() => {
    void getFirebaseAnalytics();
  }, []);

  return (
    <AuthProvider>
      <SiteSettingsProvider>{children}</SiteSettingsProvider>
    </AuthProvider>
  );
}
