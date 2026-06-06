import { PorchfestPlannerClient } from "./PorchfestPlannerClient";
import {
  EventLayersDocument,
  EventPlacementsDocument,
  type EventLayersQuery,
  type EventPlacementsQuery,
} from "@/lib/api/graphql/generated/graphql";
import { getTheseusClient } from "@/lib/api/graphql/client";
import type { AtlasEventPlannerPlacement } from "@/components/atlas/AtlasEventPlannerLayer";
import porchfestFixture from "@/data/open-flint-atlas/fixtures/porchfest-2026.json";

const TENANT_SLUG = "flint";
const EVENT_SLUG = "porchfest-2026";

export const dynamic = "force-dynamic";

type InitialPorchfestPlacement = AtlasEventPlannerPlacement & {
  readonly version?: number;
};

type FixturePlacement = {
  readonly category: string;
  readonly sublabel?: string;
  readonly label: string;
  readonly geometry: Record<string, unknown>;
  readonly notes?: string;
  readonly address?: string | null;
};

type PorchfestFixture = {
  readonly event_layer: {
    readonly slug: string;
    readonly title: string;
  };
  readonly placements: readonly FixturePlacement[];
};

const typedFixture = porchfestFixture as PorchfestFixture;

function fixturePlacements(): InitialPorchfestPlacement[] {
  return typedFixture.placements.map((placement, index) => ({
    id: `${typedFixture.event_layer.slug}-${index}`,
    eventLayerId: typedFixture.event_layer.slug,
    category: placement.category,
    sublabel: placement.sublabel ?? null,
    label: placement.label,
    geometry: placement.geometry,
    status: "planned",
    notes: placement.notes ?? null,
    address: placement.address ?? null,
  }));
}

async function fetchPlannerData(): Promise<{
  title: string;
  placements: InitialPorchfestPlacement[];
  dataSource: "graphql" | "fixture";
}> {
  const client = getTheseusClient();

  try {
    const [layersResult, placementsResult] = await Promise.all([
      client
        .query<EventLayersQuery>(EventLayersDocument, {
          tenantSlug: TENANT_SLUG,
        })
        .toPromise(),
      client
        .query<EventPlacementsQuery>(EventPlacementsDocument, {
          tenantSlug: TENANT_SLUG,
          eventSlug: EVENT_SLUG,
        })
        .toPromise(),
    ]);

    if (placementsResult.error || placementsResult.data == null) {
      throw placementsResult.error ?? new Error("Planner placements missing");
    }

    const layer = layersResult.data?.eventLayers.find(
      (candidate) => candidate.slug === EVENT_SLUG,
    );

    return {
      title: layer?.title ?? typedFixture.event_layer.title,
      placements: placementsResult.data.placements.map((placement) => ({
        id: placement.id,
        eventLayerId: placement.eventLayerId,
        category: placement.category,
        sublabel: placement.sublabel ?? null,
        label: placement.label,
        geometry: placement.geometry,
        status: placement.status,
        notes: placement.notes ?? null,
        version: placement.version,
      })),
      dataSource: "graphql",
    };
  } catch {
    return {
      title: typedFixture.event_layer.title,
      placements: fixturePlacements(),
      dataSource: "fixture",
    };
  }
}

export default async function PorchfestPage() {
  const plannerData = await fetchPlannerData();

  return (
    <PorchfestPlannerClient
      eventTitle={plannerData.title}
      initialPlacements={plannerData.placements}
      dataSource={plannerData.dataSource}
    />
  );
}
