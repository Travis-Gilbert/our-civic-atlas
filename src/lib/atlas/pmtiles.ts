"use client";

import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

let protocolRegistered = false;

export function ensurePmtilesProtocol() {
  if (protocolRegistered) return;

  const protocol = new Protocol({ metadata: true });
  try {
    maplibregl.addProtocol("pmtiles", protocol.tile);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.toLowerCase().includes("already")) {
      throw error;
    }
  }
  protocolRegistered = true;
}
