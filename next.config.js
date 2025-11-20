/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // If deploying to GitHub Pages with a repository name (not username.github.io),
  // uncomment and set the basePath to your repository name:
  // basePath: '/plan-e',
}

module.exports = nextConfig

