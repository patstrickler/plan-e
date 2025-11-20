/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Only use basePath in production builds (for GitHub Pages deployment)
  basePath: process.env.NODE_ENV === 'production' ? '/plan-e' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/plan-e' : '',
}

module.exports = nextConfig
