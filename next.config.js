/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'out',
  assetPrefix: './', // Add this for correct file:// paths
  // Ensure images are handled correctly for Electron
  images: {
    unoptimized: true,
  },
  pageExtensions: ['jsx', 'tsx'],
  // appDir is now stable and enabled by default if you have an `app` directory.
  // The experimental.appDir key is no longer needed and can cause warnings.
}

module.exports = nextConfig