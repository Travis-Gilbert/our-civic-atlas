"use client";

import Link from "next/link";

export function AtlasSceneHeader() {
  return (
    <header className="atlas-scene-header pointer-events-auto absolute left-5 right-5 top-4">
      <div className="atlas-scene-top-strip">
        <Link href="/open-flint-atlas" className="atlas-scene-wordmark">
          Flint Atlas
        </Link>
        <nav aria-label="Flint Atlas links" className="atlas-scene-top-actions">
          <Link href="/open-flint-atlas/sources">About</Link>
          <Link href="/open-flint-atlas/methodology">Methodology</Link>
          <Link href="/open-flint-atlas/contribute" data-commit="true">
            Contribute
          </Link>
        </nav>
      </div>
    </header>
  );
}
