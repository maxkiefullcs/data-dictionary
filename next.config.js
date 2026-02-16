/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a standalone server bundle for Docker (smaller image, no node_modules in runner).
  output: "standalone",
  // Work around locked .next cache files on Windows by using a fresh build directory.
  distDir: ".next-build",
};

module.exports = nextConfig;
