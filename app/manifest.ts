import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sanctos",
    short_name: "Sanctos",
    start_url: "/",
    display: "standalone",
    background_color: "#121212",
    theme_color: "#121212",
    icons: [
      {
        src: "/sanctos-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/sanctos-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
