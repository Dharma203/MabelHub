import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.26'],
  productionBrowserSourceMaps: true,
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.devtool = 'eval-source-map';
    }
    return config;
  },
}

export default nextConfig
