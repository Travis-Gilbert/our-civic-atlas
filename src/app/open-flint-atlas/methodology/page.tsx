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
    "How Flint Atlas turns public records, community review, and reconstruction support into readable civic atlas pages.",
};

const BUILDING_CLASS_COUNTS = [
  { label: "Residential", value: "18,186" },
  { label: "Commercial", value: "2,601" },
  { label: "Industrial", value: "263" },
  { label: "Civic", value: "128" },
  { label: "Unknown", value: "4" },
];

const METHOD_STEPS = [
  "Start with public records and fixture-safe summaries that can be shown without exposing private uploads.",
  "Place each record on a city object such as a parcel, block, street, park, building, or neighborhood.",
  "Separate what a record says directly from what nearby records only suggest.",
  "Show residents where the atlas is confident, where it is incomplete, and how to send corrections.",
  "Keep public contributions separate from publication until receipts and review workflows are ready.",
];

// Reconstruction stages match the procedural pipeline in
// `civic-atlas-reconstruction-engine/src/lib.rs`. Stages 1-7 are the
// engine's named sub-functions; Stage 8 is `run_full_pipeline`, the
// orchestrator that calls all seven in sequence and confirms the
// result is consistent before publication. Each label is the engine's
// stage name in plain English so a Flint resident can read the
// methodology page and the Atelier screen and tell they are looking at
// the same process.
const RECONSTRUCTION_STAGES = [
  "Gather evidence. Pull every record anchored to this parcel and the block around it: maps, photos, directories, assessor rows, standing-building controls.",
  "Read direct details. Extract footprint, height clues, material, roof shape, storefront use, address, and year from what each record says directly.",
  "Build the block context. Map the building's neighbors and how they relate: shared walls, shared setbacks, same block, adjacent street.",
  "Bring in spacetime memory. Use the surrounding block's history to give the building a position in the city's space and time, not a generic city template.",
  "Predict missing parts from context. Ask the building model to suggest only the pieces still missing after direct evidence and block memory.",
  "Merge direct and predicted. Combine what records say directly with what the model suggests, and surface every disagreement instead of quietly picking one.",
  "Queue a renderable asset. Generate the building scene asset only after the merged claim package is complete, with status and review notes attached.",
  "Run the full pipeline. Execute all seven stages as a single supervised unit, one stage at a time. If any stage fails or produces contested output, the pipeline stops and surfaces the problem rather than continuing with degraded data.",
];

// Reconstruction part-level confidence thresholds. These match the
// per-part values stored in `src/lib/atlas/historical-reconstruction.ts`
// and the visual-grammar-v1 confidence palette (`docs/design/visual-grammar-v1.md`).
const RECONSTRUCTION_PART_CONFIDENCE = [
  {
    range: "0.90 to 1.00",
    label: "High confidence",
    meaning:
      "Multiple sources agree, or one strong source covers this part directly. The atelier renders the part with full porcelain detail; the atlas hover stays clean.",
  },
  {
    range: "0.60 to 0.90",
    label: "Partial confidence",
    meaning:
      "Some evidence supports this part, but it is incomplete or weakly cited. The atelier renders the part with a softer ghost finish; the dossier shows which sources are partial.",
  },
  {
    range: "Below 0.60",
    label: "Contested",
    meaning:
      "The model is filling a gap, or sources disagree. The atelier shows the part faintly with a Contested label; the dossier opens to the disagreement so a resident can challenge it.",
  },
];

// Classifier accuracy snapshot grounded in the corpus inventory at
// `docs/plans/evidence-corpus-inventory-2026-05.md`. Numbers describe
// what the current public package can do, not what a future model will
// do; they are deliberately conservative around rare classes.
const CLASSIFIER_CONFIDENCE = [
  {
    surface: "Building typology classifier",
    coverage: "21,182 buildings in the public package",
    headlineNumber: "0.97 average confidence",
    plainEnglish:
      "The classifier is confident about most residential and commercial buildings. It is much less certain about civic, industrial, and mixed-use buildings, where the public training pool is thin.",
  },
  {
    surface: "Reconstruction per-part confidence",
    coverage: "5 Lost Flint reconstructions in the current fixture",
    headlineNumber: "0.60 to 0.95 per part",
    plainEnglish:
      "Each reconstruction stores a separate confidence for mass, facade, roof, and ground-floor use. The atelier and dossier show these individually, so a resident can see exactly which part of the building is well-supported.",
  },
];

const KNOWN_LIMITS = [
  "The public Atelier route still uses the Carriage Town fixture while the live GraphQL reconstruction resolver is connected.",
  "The current fixture has five Lost Flint reconstructions, and none yet meet the three-source pilot bar from the real-reconstruction plan.",
  "Model scores are support signals. They do not become final decisions about a building, block, or resident contribution.",
  "Photo, city-directory, and HABS-style ingest lanes need more work before the first production training run.",
  "Confidence numbers appear here, in the dossier panel, and inside the atelier. They do not appear in atlas hover tooltips. That is intentional: a number floating over a building reads as a verdict, which it is not.",
];

export default function MethodologyPage() {
  const pkg = getStaticAtlasPackage();

  return (
    <AtlasRouteShell
      eyebrow="Review Method"
      title="Methodology"
      description="Flint Atlas shows how each public claim is supported, where the app is still uncertain, and how residents can help correct the record."
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

      <AtlasSection title="How a claim enters the atlas">
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

      <AtlasSection title="Building classification">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <p className="text-[15px] leading-[1.7]" style={{ color: "var(--ctx-ink-soft)" }}>
              The current Flint package includes 21,182 mapped building
              footprints. The classifier gives the atlas a starting type for
              each footprint so the map can choose a reasonable shape, color,
              and interaction label.
            </p>
            <p
              className="mt-4 text-[15px] leading-[1.7]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              Confidence stays in this methodology view. A lower score makes the
              public interface more general or asks for review; it is not a
              verdict about a neighborhood, owner, or resident contribution.
            </p>
          </div>
          <AtlasMetaGrid>
            {BUILDING_CLASS_COUNTS.map((item) => (
              <AtlasMetaItem key={item.label} label={item.label} value={item.value} />
            ))}
          </AtlasMetaGrid>
        </div>
      </AtlasSection>

      <AtlasSection title="What the confidence numbers mean">
        <p
          className="mb-4 text-[15px] leading-[1.7]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          The atlas uses two different confidence numbers, and they answer
          different questions. The first is about the building&apos;s type today.
          The second is about how sure the atlas is about each part of a
          historical reconstruction. Both are visible here, in the dossier,
          and inside the atelier; they are not shown as floating numbers on
          the map.
        </p>
        <ul
          className="grid gap-3 text-[14px] leading-[1.65]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          {CLASSIFIER_CONFIDENCE.map((entry) => (
            <li
              key={entry.surface}
              className="rounded-[6px] border p-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className="font-mono text-[11px] uppercase tracking-[0.12em]"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  {entry.surface}
                </span>
                <span
                  className="font-mono text-[11px] tracking-[0.08em]"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  {entry.coverage}
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-[1.6]">
                <span className="font-mono text-[13px]">{entry.headlineNumber}</span>
                {" : "}
                {entry.plainEnglish}
              </p>
            </li>
          ))}
        </ul>
      </AtlasSection>

      <AtlasSection title="Reconstruction part confidence">
        <p
          className="mb-4 text-[15px] leading-[1.7]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          Each historical reconstruction stores a separate confidence number
          for the building&apos;s mass, facade, roof, and ground-floor use. The
          atelier and the dossier panel show these individually, so a resident
          can tell at a glance which parts are well-supported and which are
          the model filling a gap.
        </p>
        <ul
          className="grid gap-3 text-[14px] leading-[1.65] md:grid-cols-3"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          {RECONSTRUCTION_PART_CONFIDENCE.map((band) => (
            <li
              key={band.range}
              className="rounded-[6px] border p-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <div
                className="font-mono text-[11px] uppercase tracking-[0.12em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                {band.range}
              </div>
              <div className="mt-2 font-display text-[18px] tracking-[0.005em]">
                {band.label}
              </div>
              <p className="mt-2 text-[14px] leading-[1.6]">{band.meaning}</p>
            </li>
          ))}
        </ul>
      </AtlasSection>

      <AtlasSection title="Historic reconstruction">
        <ol
          className="grid gap-3 text-[14px] leading-[1.65] md:grid-cols-2"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          {RECONSTRUCTION_STAGES.map((stage, index) => (
            <li
              key={stage}
              className="rounded-[6px] border p-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <span
                className="mb-3 block font-mono text-[11px] uppercase tracking-[0.12em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                Stage {String(index + 1).padStart(2, "0")}
              </span>
              {stage}
            </li>
          ))}
        </ol>
      </AtlasSection>

      <AtlasSection title="Known limits">
        <ul
          className="grid gap-3 text-[14px] leading-[1.65]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          {KNOWN_LIMITS.map((limit) => (
            <li
              key={limit}
              className="rounded-[6px] border p-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              {limit}
            </li>
          ))}
        </ul>
      </AtlasSection>
    </AtlasRouteShell>
  );
}
