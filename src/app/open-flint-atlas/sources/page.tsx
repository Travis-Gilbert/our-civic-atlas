import type { Metadata } from "next";
import {
  AtlasMetaGrid,
  AtlasMetaItem,
  AtlasPillList,
  AtlasRouteShell,
  AtlasSection,
} from "@/components/atlas/AtlasRouteShell";
import {
  getAtlasSources,
  getSourceRegistryEntries,
} from "@/lib/atlas/route-lookups";

export const metadata: Metadata = {
  title: "Sources | Flint Atlas | Our Civic Atlas",
  description:
    "Public source registry for the Flint Atlas read model, including trust tier, public use limits, and freshness notes.",
};

export default function SourcesPage() {
  const sources = getAtlasSources();
  const registryById = new Map(
    getSourceRegistryEntries().map((entry) => [entry.id, entry]),
  );

  return (
    <AtlasRouteShell
      eyebrow="Public Source Registry"
      title="Sources"
      description="Every public dossier and scene object should point back to source cards with use limits, freshness labels, and privacy notes."
      actions={[{ href: "/open-flint-atlas/methodology", label: "Review method" }]}
    >
      <AtlasSection title={`${sources.length} linked source cards`}>
        <div className="grid gap-3">
          {sources.map((source) => {
            const registry = registryById.get(source.source_id);
            return (
              <article
                key={source.source_id}
                className="rounded-[6px] border p-4"
                style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{source.name}</h2>
                    <p
                      className="mt-1 font-mono text-[11px]"
                      style={{ color: "var(--ctx-ink-mute)" }}
                    >
                      {source.source_id}
                    </p>
                  </div>
                  <a
                    href={source.homepage_url}
                    className="text-[13px] underline underline-offset-4"
                    style={{ color: "var(--ctx-ink-soft)" }}
                  >
                    Source link
                  </a>
                </div>
                <AtlasMetaGrid>
                  <AtlasMetaItem label="Trust tier" value={source.trust_tier.replace(/_/g, " ")} />
                  <AtlasMetaItem label="Freshness" value={source.source_update_label.replace(/_/g, " ")} />
                  <AtlasMetaItem
                    label="Personal data"
                    value={source.contains_personal_data ? "review limits required" : "not indicated"}
                  />
                </AtlasMetaGrid>
                <div className="mt-4">
                  <AtlasPillList
                    items={[
                      source.public_use.replace(/_/g, " "),
                      registry?.current_status?.replace(/_/g, " ") ?? "registry pending",
                    ]}
                  />
                </div>
                <ul
                  className="mt-4 list-disc space-y-1 pl-5 text-[13px] leading-[1.55]"
                  style={{ color: "var(--ctx-ink-soft)" }}
                >
                  {source.known_limits.slice(0, 2).map((limit) => (
                    <li key={limit}>{limit}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </AtlasSection>
    </AtlasRouteShell>
  );
}
