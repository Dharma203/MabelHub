/** @type {import('next').NextConfig} */

import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    qualities: [75, 80],
    formats: ['image/avif', 'image/webp'], // ← tambah ini untuk konversi otomatis ke WebP
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hub.mabel.co.id',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'hub.mabel.co.id',
        pathname: '/api/visits/**',
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

  // ✅ FIX #1: matikan source map di production
  productionBrowserSourceMaps: false,

  // ✅ FIX #2: tambah pengecekan `dev` agar eval-source-map hanya aktif saat development
  webpack: (config, { isServer, dev }) => {
    if (!isServer && dev) {
      config.devtool = 'eval-source-map'
    }
    return config
  },

  // ❌ HAPUS: turbopack: {} tidak berguna kalau kosong
}

export default bundleAnalyzer(nextConfig)
