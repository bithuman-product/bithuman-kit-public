/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    NEXT_PUBLIC_APP_CONFIG: process.env.NEXT_PUBLIC_APP_CONFIG,
  },
};

module.exports = nextConfig;
