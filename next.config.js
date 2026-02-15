/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a standalone server bundle for Docker (smaller image, no node_modules in runner).
  output: "standalone",
};

module.exports = nextConfig;
