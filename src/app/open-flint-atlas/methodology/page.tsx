import type { Metadata } from "next";
import {
  AtlasMetaGrid,
  AtlasMetaItem,
  AtlasRouteShell,
  AtlasSection,
} from "@/components/atlas/AtlasRouteShell";
import { getStaticAtlasPackage } from "@/lib/atlas/static-package";

export const metadata: Metadata = {
  title: "Methodology | Flint Atlas | Our Civic Atlas",
  description:
    "How Flint Atlas separates public read models, source evidence, review state, and contribution boundaries.",
};

const METHOD_STEPS = [
  "Source registry entries define public use, privacy limits, and freshness expectations.",
  "Reviewed fixtures project into public read models for places, events, metrics, sources, and provenance previews.",
  "Dossiers expose summary, source cards, confidence reasons, timelines, metrics, privacy flags, and citation downloads.",
  "Scene manifests describe renderable civic objects without requiring live generation in the public route.",
  "Contribution writes remain separate from publication until receipts and maintainer review are shipped.",
];

export default function MethodologyPage() {
  const pkg = getStaticAtlasPackage();

  return (
    <AtlasRouteShell
      eyebrow="Review Method"
      title="Methodology"
      description="Flint Atlas treats source visibility, privacy class, confidence explanation, and review state as part of the public product surface."
      actions={[{ href: "/open-flint-atlas/contribute", label: "Contribution boundary" }]}
    >
      <AtlasSection title="Static package status">
        <AtlasMetaGrid>
          <AtlasMetaItem label="Atlas node" value={pkg.atlasNode.name} />
          <AtlasMetaItem label="Federation" value={pkg.atlasNode.federation_status} />
          <AtlasMetaItem label="Civic objects" value={pkg.civicObjects.length} />
          <AtlasMetaItem label="Catalog nodes" value={pkg.nodeCatalog.nodes.length} />
          <AtlasMetaItem label="Layers" value={pkg.layerCatalog.layers.length} />
          <AtlasMetaItem label="Scene manifests" value={pkg.sceneManifests.length} />
        </AtlasMetaGrid>
      </AtlasSection>

      <AtlasSection title="Evidence flow">
        <ol
          className="grid gap-3 text-[14px] leading-[1.65]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          {METHOD_STEPS.map((step, index) => (
            <li
              key={step}
              className="rounded-[6px] border p-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <span
                className="mr-3 font-mono text-[11px] uppercase tracking-[0.12em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </AtlasSection>
    </AtlasRouteShell>
  );
}
