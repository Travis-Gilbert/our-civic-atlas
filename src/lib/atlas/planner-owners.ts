"use client";

/**
 * Porchfest planner owner roster.
 *
 * The planner assigns tasks by display name (a small known crew), not by
 * an auth-backed planner-user id. This is the editable source of those
 * names: a default crew plus any names the planners add or rename, kept
 * in localStorage so the list survives reloads without a backend. The
 * selected name flows to the task as `ownerDisplay`.
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "porchfest:planner-owners";

export const DEFAULT_OWNERS: readonly string[] = [
  "Travis G",
  "Derek D",
  "Kate S",
  "Liz G",
  "Kady Y",
  "Jeff S",
  "Phoebe",
];

function loadOwners(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_OWNERS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_OWNERS];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed as string[];
    }
  } catch {
    // Corrupt or unavailable storage: fall back to the default crew.
  }
  return [...DEFAULT_OWNERS];
}

export interface PlannerOwners {
  readonly owners: string[];
  readonly addOwner: (name: string) => void;
  readonly renameOwner: (oldName: string, newName: string) => void;
  readonly removeOwner: (name: string) => void;
}

export function usePlannerOwners(): PlannerOwners {
  // Seed from the defaults on the server and the first client paint so
  // SSR and hydration agree; load the saved list after mount.
  const [owners, setOwners] = useState<string[]>(() => [...DEFAULT_OWNERS]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOwners(loadOwners());
    setLoaded(true);
  }, []);

  // Persist after the initial load so we never overwrite a saved list
  // with the defaults before it has been read.
  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(owners));
    } catch {
      // Storage full or disabled: keep the in-memory list working.
    }
  }, [owners, loaded]);

  const addOwner = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setOwners((prev) =>
      prev.some((o) => o.toLowerCase() === trimmed.toLowerCase())
        ? prev
        : [...prev, trimmed],
    );
  }, []);

  const renameOwner = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setOwners((prev) => prev.map((o) => (o === oldName ? trimmed : o)));
  }, []);

  const removeOwner = useCallback((name: string) => {
    setOwners((prev) => prev.filter((o) => o !== name));
  }, []);

  return { owners, addOwner, renameOwner, removeOwner };
}
