import type { Metadata } from "next";
import { OpenFlintAtlasScene } from "@/components/atlas/OpenFlintAtlasScene";

export const metadata: Metadata = {
  title: "Mobile Candidate | Flint Atlas | Our Civic Atlas",
  description:
    "Deck-backed mobile candidate route for the Flint Atlas runtime promotion boundary.",
};

export default function OpenFlintAtlasMobileCandidatePage() {
  return (
    <OpenFlintAtlasScene
      initialLens="explore"
      initialViewMode="atlas"
      preferredMobileSurface="deck_mobile_candidate"
    />
  );
}
