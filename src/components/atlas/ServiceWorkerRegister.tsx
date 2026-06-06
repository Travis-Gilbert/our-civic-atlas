"use client";

import { useEffect } from "react";

/**
 * Registers the PorchFest service worker (public/sw.js) scoped to
 * /porchfest, making the planner installable and offline-capable. Renders
 * nothing. Registration is deferred to the load event so it never competes
 * with first paint, and failures are swallowed (a missing or blocked SW
 * must not break the page).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/porchfest" })
        .catch(() => {
          // Ignore: the planner works without the SW, just without offline.
        });
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
