import type { Metadata } from "next";
import CivicWorkspaceClient from "./CivicWorkspaceClient";

export const metadata: Metadata = {
  title: "Planning Workspace | PorchFest | Our Civic Atlas",
  description:
    "Organizer workspace for Porchfest 2026 applications: shared civic-object database with table and kanban views over the collaborative store.",
};

export default function CivicWorkspacePage() {
  return <CivicWorkspaceClient />;
}
