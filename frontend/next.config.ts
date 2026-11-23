import path from "path";
import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      // Fotos de perfil servidas pelo backend (US23)
      {
        source: "/fotosPerfil/:path*",
        destination: `${BACKEND_URL}/fotosPerfil/:path*`,
      },
    ];
  },
};

export default nextConfig;
