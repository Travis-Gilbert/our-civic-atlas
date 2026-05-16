import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AtlasMetaGrid,
  AtlasMetaItem,
  AtlasPillList,
  AtlasRouteShell,
  AtlasSection,
} from "@/components/atlas/AtlasRouteShell";
import {
  findAtlasNode,
  getNodeCatalogEntries,
} from "@/lib/atlas/route-lookups";
import { getCurrentAtlasNodeSummary } from "@/lib/atlas/node-horizon";

type PageProps = {
  params: Promise<{ atlasId: string }>;
};

function decode(value: string) {
  return decodeURIComponent(value);
}

function relationLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function generateStaticParams() {
  return getNodeCatalogEntries().map((node) => ({
    atlasId: node.atlas_id,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const node = findAtlasNode(decode((await params).atlasId));
  if (!node) return {};
  return {
    title: `${node.name} | Node | Flint Atlas`,
    description:
      node.description ??
      "Atlas node record with federation status, capabilities, and public read-model boundary.",
  };
}

export default async function AtlasNodePage({ params }: PageProps) {
  const node = findAtlasNode(decode((await params).atlasId));
  if (!node) notFound();
  const currentNode = getCurrentAtlasNodeSummary();
  const compareHref = node.compare_available
    ? `/open-flint-atlas?compare=${encodeURIComponent(node.atlas_id)}#node-horizon`
    : null;
  const actions = [
    { href: "/open-flint-atlas#node-horizon", label: "Node Horizon" },
    ...(compareHref
      ? [
          {
            href: compareHref,
            label: `Compare with ${currentNode?.name ?? "Flint Atlas"}`,
          },
        ]
      : []),
    { href: "/open-flint-atlas", label: "Open map" },
  ];

  return (
    <AtlasRouteShell
      eyebrow="Atlas Node"
      title={node.name}
      description={
        node.description ??
        "Atlas node record with federation status, capabilities, and public read-model boundary."
      }
      actions={actions}
    >
      <AtlasSection title="Breadcrumb">
        <nav
          aria-label="Atlas breadcrumb"
          className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.55] text-[color:var(--ctx-ink-soft)]"
        >
          <Link
            href="/open-flint-atlas"
            className="underline decoration-[rgba(42,36,25,0.28)] underline-offset-4"
          >
            Atlas network
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/open-flint-atlas#node-horizon"
            className="underline decoration-[rgba(42,36,25,0.28)] underline-offset-4"
          >
            {currentNode?.name ?? "Flint Atlas"}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[color:var(--ctx-ink)]">{node.name}</span>
        </nav>
      </AtlasSection>

      <AtlasSection title="Federation path">
        <AtlasMetaGrid>
          <AtlasMetaItem
            label="Current scene"
            value={currentNode?.name ?? "Flint Atlas"}
          />
          <AtlasMetaItem label="Node relation" value={relationLabel(node.relation)} />
          <AtlasMetaItem
            label="Return path"
            value={
              <Link
                href="/open-flint-atlas#node-horizon"
                className="underline decoration-[rgba(42,36,25,0.28)] underline-offset-4"
              >
                {currentNode?.name ?? "Flint Atlas"} Node Horizon
              </Link>
            }
          />
          <AtlasMetaItem
            label="Compare"
            value={
              compareHref ? (
                <Link
                  href={compareHref}
                  className="underline decoration-[rgba(42,36,25,0.28)] underline-offset-4"
                >
                  Open compare in Flint Atlas
                </Link>
              ) : (
                "planned"
              )
            }
          />
        </AtlasMetaGrid>
      </AtlasSection>

      <AtlasSection title="Node status">
        <AtlasMetaGrid>
          <AtlasMetaItem label="Atlas id" value={node.atlas_id} />
          <AtlasMetaItem label="Relation" value={relationLabel(node.relation)} />
          <AtlasMetaItem label="Scope" value={relationLabel(node.scope_type)} />
          <AtlasMetaItem label="Federation" value={node.federation_status} />
          <AtlasMetaItem label="Freshness" value={node.freshness_label ?? node.last_updated_at ?? "planned"} />
          <AtlasMetaItem label="Maintainer" value={node.maintainer_label ?? "maintainer planned"} />
        </AtlasMetaGrid>
      </AtlasSection>

      <AtlasSection title="Capabilities">
        <AtlasPillList items={node.capabilities} />
      </AtlasSection>
    </AtlasRouteShell>
  );
}
