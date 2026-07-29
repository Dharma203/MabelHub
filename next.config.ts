import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hub.mabel.co.id',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'api.mabel.co.id',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/visits/**',
      },
    ],
  },
  allowedDevOrigins: ['192.168.1.21'],
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
