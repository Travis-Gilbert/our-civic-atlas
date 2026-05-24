import type { ReactNode } from "react";
import "./atelier.css";

/**
 * Atelier route wrapper.
 *
 * Mounts the `.atelier-theme` scoping class so tokens defined in
 * `atelier.css` cascade ONLY to the atelier surface (and any sub-routes
 * under `/open-flint-atlas/atelier/`). The rest of the atlas continues to
 * read `--ctx-*` tokens from the parent `.civic-atlas` scope.
 *
 * Decisions 1-8 from `docs/design/atelier-visual-register-proposal.md`
 * are locked in `atelier.css`.
 */
export default function AtelierLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="atelier-theme h-full w-full">{children}</div>;
}
