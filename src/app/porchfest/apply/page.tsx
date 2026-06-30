import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Not Found | PorchFest 2026",
};

export default function PorchfestApplyPage() {
  notFound();
}
