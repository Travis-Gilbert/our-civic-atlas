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
  findSceneManifest,
  getSceneManifests,
} from "@/lib/atlas/route-lookups";

type PageProps = {
  params: Promise<{ sceneId: string }>;
};

function decode(value: string) {
  return decodeURIComponent(value);
}

export function generateStaticParams() {
  return getSceneManifests().map((scene) => ({ sceneId: scene.scene_id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const scene = findSceneManifest(decode((await params).sceneId));
  if (!scene) return {};
  return {
    title: `${scene.name} | Scene | Flint Atlas`,
    description: scene.description,
  };
}

export default async function ScenePage({ params }: PageProps) {
  const scene = findSceneManifest(decode((await params).sceneId));
  if (!scene) notFound();

  return (
    <AtlasRouteShell
      eyebrow="Scene Manifest"
      title={scene.name}
      description={scene.description}
      actions={[{ href: "/open-flint-atlas", label: "Open renderer" }]}
    >
      <AtlasSection title="Scene contract">
        <AtlasMetaGrid>
          <AtlasMetaItem label="Scene id" value={scene.scene_id} />
          <AtlasMetaItem label="Atlas node" value={scene.atlas_node_id} />
          <AtlasMetaItem label="Review" value={scene.review_state.replace(/_/g, " ")} />
          <AtlasMetaItem label="Objects" value={scene.objects.length} />
          <AtlasMetaItem label="Sources" value={scene.source_ids.length} />
          <AtlasMetaItem label="Support" value={`${Math.round(scene.confidence.score * 100)}% reviewed`} />
        </AtlasMetaGrid>
      </AtlasSection>

      <AtlasSection title="Renderable objects">
        <div className="grid gap-3">
          {scene.objects.map((object) => (
            <article
              key={object.object_id}
              className="rounded-[6px] border p-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <AtlasMetaGrid>
                <AtlasMetaItem label="Object" value={object.object_id} />
                <AtlasMetaItem label="Render mode" value={object.render_mode.replace(/_/g, " ")} />
                <AtlasMetaItem label="Style token" value={object.style_token.replace(/_/g, " ")} />
              </AtlasMetaGrid>
            </article>
          ))}
        </div>
      </AtlasSection>

      <AtlasSection title="Sources">
        <AtlasPillList items={scene.source_ids} />
      </AtlasSection>
    </AtlasRouteShell>
  );
}
