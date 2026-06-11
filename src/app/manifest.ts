import type { MetadataRoute } from "next";

/**
 * Web App Manifest. Scoped to the PorchFest planner so it installs as its
 * own home-screen app: start_url and scope are /porchfest, the theme uses
 * the Path B navy-primary token, and the icon is the porch mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PorchFest Planner",
    short_name: "PorchFest",
    description:
      "Carriage Town PorchFest planning surface for the Flint city atlas.",
    id: "/porchfest",
    start_url: "/porchfest",
    scope: "/porchfest",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#005186",
    icons: [
      {
        src: "/porchfest-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/porchfest-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
