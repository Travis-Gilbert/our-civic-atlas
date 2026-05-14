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
  findCivicObject,
  getCivicObjects,
} from "@/lib/atlas/route-lookups";

type PageProps = {
  params: Promise<{ objectId: string }>;
};

function decode(value: string) {
  return decodeURIComponent(value);
}

export function generateStaticParams() {
  return getCivicObjects().map((object) => ({ objectId: object.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const object = findCivicObject(decode((await params).objectId));
  if (!object) return {};
  return {
    title: `${object.name} | Object | Flint Atlas`,
    description: object.description,
  };
}

export default async function ObjectPage({ params }: PageProps) {
  const object = findCivicObject(decode((await params).objectId));
  if (!object) notFound();

  return (
    <AtlasRouteShell
      eyebrow="Civic Object"
      title={object.name}
      description={object.description}
      actions={[{ href: "/open-flint-atlas/methodology", label: "Review method" }]}
    >
      <AtlasSection title="Object state">
        <AtlasMetaGrid>
          <AtlasMetaItem label="Object id" value={object.id} />
          <AtlasMetaItem label="Type" value={object.object_type.replace(/_/g, " ")} />
          <AtlasMetaItem label="Review" value={object.review_state.replace(/_/g, " ")} />
          <AtlasMetaItem label="Temporal" value={object.temporal_status.replace(/_/g, " ")} />
          <AtlasMetaItem label="Current" value={object.current_status.replace(/_/g, " ")} />
          <AtlasMetaItem label="Confidence" value={`${Math.round(object.confidence_score * 100)}% support`} />
        </AtlasMetaGrid>
      </AtlasSection>

      <AtlasSection title="Confidence reasons">
        <ul
          className="list-disc space-y-2 pl-5 text-[14px] leading-[1.65]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          {object.confidence_reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </AtlasSection>

      <AtlasSection title="Render modes and sources">
        <div className="grid gap-4">
          <AtlasPillList items={object.render_modes} />
          <AtlasPillList items={object.source_ids} />
        </div>
      </AtlasSection>
    </AtlasRouteShell>
  );
}
