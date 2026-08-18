/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No remote image patterns needed — car photos are stored as base64
  // data URIs directly on the session document, not hosted as files.
};

module.exports = nextConfig;
