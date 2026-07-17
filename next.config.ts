import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Firebase Admin SDK is server-only and pulls in Node built-ins.
  // Keep it external so it is not bundled into the serverless runtime.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
