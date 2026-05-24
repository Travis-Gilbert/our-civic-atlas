"use client";

/**
 * SavedAtelierClient - resolves a saved-reconstruction id to its
 * underlying reconstructionId + year, then mounts `<AtelierSurface>`.
 *
 * v1 reads through `useSavedReconstruction` (PT-103c) which queries
 * the backend resolver. When the resolver is down (PT-104b not yet
 * shipped), the user sees an honest error message and a link back to
 * the atelier root. NO fallback synthesizer: a saved record only
 * exists when it was persisted to the backend; missing means missing.
 */

import Link from "next/link";

import { useSavedReconstruction } from "@/lib/atlas/use-saved-reconstruction";
import { FLINT_LOST_RECONSTRUCTIONS } from "@/lib/atlas/historical-reconstruction";
import { AtelierSurface } from "@/components/atlas/atelier/AtelierSurface";

type SavedAtelierClientProps = {
  savedId: string;
};

export function SavedAtelierClient({ savedId }: SavedAtelierClientProps) {
  const { saved, loading, error, notFound } = useSavedReconstruction(savedId);

  if (loading) {
    return (
      <CenteredState>
        <p
          style={{
            color: "var(--atelier-ink-mute)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Loading saved reconstruction…
        </p>
      </CenteredState>
    );
  }

  if (notFound) {
    return (
      <CenteredState>
        <h2 className="atelier-dossier__title">Saved reconstruction not found</h2>
        <p className="atelier-dossier__caption" style={{ marginTop: 8 }}>
          The saved id <code>{savedId}</code> does not match any record in the
          backend. The save may have been removed, or the share URL may be
          incorrect.
        </p>
        <Link
          href="/open-flint-atlas/atelier/building%3Acarriage-town%3A1/1925"
          className="atelier-replay-button"
          style={{ marginTop: 16, display: "inline-block" }}
        >
          Open the Atelier on Whaley House
        </Link>
      </CenteredState>
    );
  }

  if (error) {
    return (
      <CenteredState>
        <h2 className="atelier-dossier__title">Save backend pending</h2>
        <p className="atelier-dossier__caption" style={{ marginTop: 8 }}>
          The Atelier&apos;s save mutation is not yet implemented on the
          backend. Until it ships, share URLs cannot be resolved.
        </p>
        <p
          className="atelier-dossier__caption"
          style={{ marginTop: 8, opacity: 0.7 }}
        >
          {error}
        </p>
        <Link
          href="/open-flint-atlas/atelier/building%3Acarriage-town%3A1/1925"
          className="atelier-replay-button"
          style={{ marginTop: 16, display: "inline-block" }}
        >
          Open the Atelier on Whaley House
        </Link>
      </CenteredState>
    );
  }

  if (!saved) {
    return (
      <CenteredState>
        <p className="atelier-dossier__caption">
          No saved record available.
        </p>
      </CenteredState>
    );
  }

  // Resolve the reconstructionId back to a parcel id for the surface
  // route contract. The fixture has a 1-to-1 map; in production the
  // backend resolver's response carries reconstructionId directly.
  const reconstruction = FLINT_LOST_RECONSTRUCTIONS.find(
    (item) => item.id === saved.reconstructionId,
  );
  const parcelId = reconstruction?.civic_object_id ?? saved.reconstructionId;

  return (
    <AtelierSurface
      reconstructionId={saved.reconstructionId}
      parcelId={parcelId}
      year={saved.year}
    />
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "var(--atelier-paper)",
        color: "var(--atelier-ink)",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>{children}</div>
    </div>
  );
}
