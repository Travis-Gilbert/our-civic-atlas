import { NextResponse } from "next/server";

import { getStaticAtlasPackage } from "@/lib/atlas/static-package";

export function GET() {
  return NextResponse.json(getStaticAtlasPackage().discoveryManifest);
}
