import type { Metadata } from "next";
import { PorchfestPublicShell } from "@/components/porchfest-site/PorchfestPublicShell";

export const metadata: Metadata = {
  title: "Board Dashboard | Porchfest 2026",
};

export default function PorchfestPublicBoardPage() {
  return <PorchfestPublicShell page="board" />;
}
