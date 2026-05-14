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
  findPlace,
  getAtlasPlaces,
} from "@/lib/atlas/route-lookups";

type PageProps = {
  params: Promise<{ placeId: string }>;
};

function decode(value: string) {
  return decodeURIComponent(value);
}

export function generateStaticParams() {
  return getAtlasPlaces()
    .slice(0, 20)
    .map((place) => ({ placeId: place.properties.place_id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const place = findPlace(decode((await params).placeId));
  if (!place) return {};
  return {
    title: `${place.properties.name} | Place | Flint Atlas`,
    description: `Public place record for ${place.properties.name} in the Flint Atlas read model.`,
  };
}

export default async function PlacePage({ params }: PageProps) {
  const place = findPlace(decode((await params).placeId));
  if (!place) notFound();

  return (
    <AtlasRouteShell
      eyebrow="Place Dossier Route"
      title={place.properties.name}
      description="Public place routes expose the same source-backed read-model subject used by the map and dossier API."
      actions={[
        {
          href: `/api/v2/theseus/open-flint-atlas/dossiers/${encodeURIComponent(
            place.properties.place_id,
          )}/`,
          label: "Dossier JSON",
        },
      ]}
    >
      <AtlasSection title="Place record">
        <AtlasMetaGrid>
          <AtlasMetaItem label="Place id" value={place.properties.place_id} />
          <AtlasMetaItem label="Type" value={place.properties.place_type.replace(/_/g, " ")} />
          <AtlasMetaItem label="Privacy" value={place.properties.privacy_class.replace(/_/g, " ")} />
          <AtlasMetaItem label="Geometry ref" value={place.properties.geometry_ref ?? "not published"} />
          <AtlasMetaItem label="Ward" value={place.properties.ward_number ?? "not assigned"} />
        </AtlasMetaGrid>
      </AtlasSection>

      <AtlasSection title="Linked sources">
        <AtlasPillList items={place.properties.source_ids ?? []} />
      </AtlasSection>

      <AtlasSection title="Map context">
        <Link
          href="/open-flint-atlas"
          className="rounded-[4px] border px-3 py-2 text-[13px]"
          style={{ borderColor: "rgba(42, 36, 25, 0.12)" }}
        >
          Open atlas scene
        </Link>
      </AtlasSection>
    </AtlasRouteShell>
  );
}
