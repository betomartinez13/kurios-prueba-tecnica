import type { NextConfig } from "next";

// Se lee al construir: las reglas de rewrites quedan fijadas en el build.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Django exige la barra final (APPEND_SLASH); Next no debe quitarla ni redirigir.
  // Así las peticiones a /api llegan a Django exactamente como se enviaron.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${BACKEND_URL}/api/:path*/` },
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
