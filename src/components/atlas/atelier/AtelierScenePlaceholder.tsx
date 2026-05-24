"use client";

/**
 * AtelierScenePlaceholder - placeholder for the R3F scene that lands at
 * PT-204. Renders the paper-grid base + a centered "Building renders here"
 * text marker so the atelier surface reads as the takeover register before
 * the full 3D scene is wired.
 *
 * Replaced by `<AtelierR3FScene>` (PT-204) once the camera rig, building
 * meshes, conflict markers, provenance lines, and dust motes are
 * implemented. The placeholder uses the same scene container so the
 * swap is a one-line change in `AtelierSurface`.
 */

type AtelierScenePlaceholderProps = {
  reconstructionName: string;
};

export function AtelierScenePlaceholder({
  reconstructionName,
}: AtelierScenePlaceholderProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        backgroundImage:
          "linear-gradient(rgba(107, 90, 69, 0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(107, 90, 69, 0.32) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        backgroundPosition: "center center",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          background: "rgba(38, 34, 28, 0.7)",
          border: "1px solid rgba(242, 241, 236, 0.12)",
          borderRadius: 4,
          color: "var(--atelier-ink-mute)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        <div style={{ color: "var(--atelier-ink)", fontSize: 13, fontWeight: 500 }}>
          {reconstructionName}
        </div>
        <div style={{ marginTop: 8, opacity: 0.7 }}>
          R3F scene mounts here at PT-204
        </div>
        <div style={{ marginTop: 4, opacity: 0.5, fontSize: 10 }}>
          building mesh · provenance lines · conflict markers · dust motes
        </div>
      </div>
    </div>
  );
}
