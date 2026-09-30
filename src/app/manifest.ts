import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vouchers",
    short_name: "Vouchers",
    description: "Digitalización de vouchers y comprobantes de pago",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6fa",
    theme_color: "#1d4ed8",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
