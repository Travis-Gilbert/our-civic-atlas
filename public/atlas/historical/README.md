# Lost Flint Asset Slot

Drop high-fidelity historical building meshes here. Each reconstruction
goes in its own subdirectory keyed by slug:

```
public/atlas/historical/
├── README.md                            ← this file
├── hubbard-drug/
│   └── hubbard-drug-v1.glb              ← optional glTF mesh
└── industrial-shed/
    └── industrial-shed-v1.glb
```

## Wiring

Point a `HistoricalReconstruction.geometry_url` (in
`src/lib/atlas/historical-reconstruction.ts`) at the file:

```ts
{
  id: "historical:carriage-town:hubbard-drug",
  // ...
  geometry_url: "/atlas/historical/hubbard-drug/hubbard-drug-v1.glb",
}
```

The renderer (`src/components/atlas/AtlasLostFlintDeckLayer.ts`) dispatches
on file extension:

| extension      | renderer                                        |
|----------------|-------------------------------------------------|
| `.glb / .gltf` | deck.gl `ScenegraphLayer`                       |
| `.splat / .ply`| falls through to procedural box (splat layer TBD) |
| `null`         | procedural box with confidence-mix shader       |

## Authoring conventions

- Export at real-world meter scale. The `ScenegraphLayer` does not
  apply `footprint.width_m / depth_m` — the mesh's intrinsic geometry
  carries the size. (The procedural box DOES use those fields.)
- Y-up is fine. deck.gl reads glTF orientation per the spec.
- Bearing is applied via `getOrientation = [0, 90 - bearing_deg, 0]`
  — the mesh should face north by default and the reconstruction's
  `bearing_deg` rotates it clockwise from there.
- Keep file size modest — these load on every scene mount. Use
  Draco compression where supported.

## Why no sample asset is checked in

A placeholder cube would render identically to the procedural box at
that lat/lng, so it would not visually demonstrate the ScenegraphLayer
path. The slot is empty until a real Blender / Scene Foundry export
arrives.
