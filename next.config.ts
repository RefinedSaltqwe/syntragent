import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "savs6js8.us-west.insforge.app",
      },
    ],
  },
  allowedDevOrigins: ["yolande-sistroid-jenee.ngrok-free.dev"],
};

export default nextConfig;
