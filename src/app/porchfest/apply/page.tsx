import type { Metadata } from "next";

import { PlannerClientProvider } from "@/lib/api/graphql/PlannerClientProvider";
import { PORCHFEST_APPLICATION_CLOSE_LABEL } from "@/lib/porchfest/porchfest-event";

import { PorchfestApplicationForm } from "./PorchfestApplicationForm";
import "./apply.css";

export const metadata: Metadata = {
  title: "Apply for PorchFest 2026 | Our Civic Atlas",
  description: `Public application intake for Carriage Town PorchFest 2026. Applications close ${PORCHFEST_APPLICATION_CLOSE_LABEL}.`,
};

export default function PorchfestApplyPage() {
  return (
    <PlannerClientProvider>
      <PorchfestApplicationForm />
    </PlannerClientProvider>
  );
}
