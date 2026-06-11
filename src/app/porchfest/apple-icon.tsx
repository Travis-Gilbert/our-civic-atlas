import { ImageResponse } from "next/og";

// iOS home-screen icon for /porchfest. Generated as a PNG (Satori renders
// text + divs reliably; the richer porch glyph ships as the manifest SVG).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#005186",
          fontSize: 96,
          fontWeight: 700,
          fontFamily: "Georgia, 'Times New Roman', serif",
          letterSpacing: -4,
        }}
      >
        PF
      </div>
    ),
    { ...size },
  );
}
