import type { Metadata } from "next";
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

type PageProps = {
  params: Promise<{ atlasId: string }>;
};

function decode(value: string) {
  return decodeURIComponent(value);
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

  return (
    <AtlasRouteShell
      eyebrow="Atlas Node"
      title={node.name}
      description={
        node.description ??
        "Atlas node record with federation status, capabilities, and public read-model boundary."
      }
      actions={[{ href: "/open-flint-atlas", label: "Open map" }]}
    >
      <AtlasSection title="Node status">
        <AtlasMetaGrid>
          <AtlasMetaItem label="Atlas id" value={node.atlas_id} />
          <AtlasMetaItem label="Relation" value={node.relation.replace(/_/g, " ")} />
          <AtlasMetaItem label="Scope" value={node.scope_type.replace(/_/g, " ")} />
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
