/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://movy-backend:3001/api';
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
