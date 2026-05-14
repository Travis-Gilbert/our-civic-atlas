import type { Metadata } from "next";
import Link from "next/link";
import {
  AtlasMetaGrid,
  AtlasMetaItem,
  AtlasRouteShell,
  AtlasSection,
} from "@/components/atlas/AtlasRouteShell";

export const metadata: Metadata = {
  title: "Contribute | Flint Atlas | Our Civic Atlas",
  description:
    "Public contribution boundary for Flint Atlas: corrections, source links, observations, and privacy-first review status.",
};

const CONTRIBUTION_PATHS = [
  {
    name: "Suggest a correction",
    state: "receipt flow planned",
    publicBoundary: "public summary after review",
    privateBoundary: "contact details and raw notes stay private",
  },
  {
    name: "Add a source link",
    state: "source nomination planned",
    publicBoundary: "link, citation, and source-use note after review",
    privateBoundary: "submitter identity is not published by default",
  },
  {
    name: "Share an observation",
    state: "moderation preflight planned",
    publicBoundary: "aggregate-safe observation after review",
    privateBoundary: "raw uploads and precise personal details stay private",
  },
];

export default function ContributePage() {
  return (
    <AtlasRouteShell
      eyebrow="Public Contribution Boundary"
      title="Contribute"
      description="The standalone atlas exposes the public contribution route now, while write intake remains gated until receipts, privacy separation, and maintainer review are complete."
      actions={[{ href: "/open-flint-atlas/sources", label: "Review sources" }]}
    >
      <AtlasSection title="Contribution paths">
        <div className="grid gap-3 md:grid-cols-3">
          {CONTRIBUTION_PATHS.map((path) => (
            <article
              key={path.name}
              className="rounded-[6px] border p-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <h2 className="text-base font-semibold">{path.name}</h2>
              <AtlasMetaGrid>
                <AtlasMetaItem label="State" value={path.state} />
                <AtlasMetaItem label="Public boundary" value={path.publicBoundary} />
                <AtlasMetaItem label="Private boundary" value={path.privateBoundary} />
              </AtlasMetaGrid>
            </article>
          ))}
        </div>
      </AtlasSection>

      <AtlasSection title="Current write behavior">
        <p
          className="text-[14px] leading-[1.65]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          Public read routes are live. Capture, review, and contribution writes
          intentionally return `501` in this standalone slice until the receipt
          and review queue are implemented.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/open-flint-atlas/methodology"
            className="rounded-[4px] border px-3 py-2 text-[13px]"
            style={{ borderColor: "rgba(42, 36, 25, 0.12)" }}
          >
            Methodology
          </Link>
          <Link
            href="/api/v2/theseus/open-flint-atlas/capture/sources/"
            className="rounded-[4px] border px-3 py-2 text-[13px]"
            style={{ borderColor: "rgba(42, 36, 25, 0.12)" }}
          >
            Capture source preview
          </Link>
        </div>
      </AtlasSection>
    </AtlasRouteShell>
  );
}
