import type { Metadata } from "next";

import { PlannerClientProvider } from "@/lib/api/graphql/PlannerClientProvider";

import { PorchfestApplicationForm } from "./PorchfestApplicationForm";

export const metadata: Metadata = {
  title: "Apply for PorchFest 2026 | Our Civic Atlas",
  description: "Public application intake for Carriage Town PorchFest 2026.",
};

export default function PorchfestApplyPage() {
  return (
    <PlannerClientProvider>
      <PorchfestApplicationForm />
    </PlannerClientProvider>
  );
}
