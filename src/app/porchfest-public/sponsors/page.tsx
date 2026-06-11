import type { Metadata } from "next";
import { PorchfestPublicShell } from "@/components/porchfest-site/PorchfestPublicShell";

export const metadata: Metadata = {
  title: "Sponsor Porchfest 2026 | Carriage Town, Flint",
};

export default function PorchfestPublicSponsorsPage() {
  return <PorchfestPublicShell page="sponsors" />;
}
