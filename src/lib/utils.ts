import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Canonical className merger for Context-Theorem-UI primitives.
 *
 * Accepts `ClassValue[]` (strings, falsy values, arrays, and object maps),
 * runs them through clsx, and then resolves Tailwind conflict pairs via
 * tailwind-merge. This matches the signature that shadcn-shaped primitives
 * expect from `@/lib/utils` and is a superset of the legacy `@/lib/cn`
 * helper (which only accepted strings or falsy values).
 *
 * Both import paths are supported for now: `@/lib/utils` is the new
 * canonical home, and `@/lib/cn` re-exports from here so existing callers
 * continue to resolve without code changes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}
