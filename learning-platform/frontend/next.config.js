/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'http',  hostname: 'minio' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    const API_BASE = process.env.INTERNAL_API_URL || 'http://nginx-gateway:80';
    return [
      { source: '/api/courses/:path*',   destination: `${API_BASE}/api/courses/:path*` },
      { source: '/api/users/:path*',     destination: `${API_BASE}/api/users/:path*` },
      { source: '/api/analytics/:path*', destination: `${API_BASE}/api/analytics/:path*` },
      { source: '/api/ai/:path*',        destination: `${API_BASE}/api/ai/:path*` },
    ];
  },
};

module.exports = nextConfig;
