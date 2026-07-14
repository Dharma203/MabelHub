import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hub.mabel.co.id',
        pathname: '/uploads/**',
      },
    ],
  },
  allowedDevOrigins: ['192.168.1.26'],
  productionBrowserSourceMaps: true,
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.devtool = 'eval-source-map'
    }
    return config
  },
}

export default nextConfig
