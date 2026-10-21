"use client";

import { useEffect } from "react";
import { initFirebaseAnalytics } from "@/lib/firebase";

/**
 * Mounts once at the root and boots Firebase Analytics for the
 * "public-tender" project — browser-supported environments only,
 * silently skipped everywhere else (SSR, private mode, blocked network).
 */
export function FirebaseAnalytics() {
  useEffect(() => {
    void initFirebaseAnalytics();
  }, []);
  return null;
}
