/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'out',
  // Ensure images are handled correctly for Electron
  images: {
    unoptimized: true,
  },
  // Disable server components for Electron
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig 