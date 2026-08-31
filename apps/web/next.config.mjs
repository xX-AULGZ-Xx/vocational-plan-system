/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:5050/api/v1/:path*',
      },
      {
        source: '/storage/:path*',
        destination: 'http://localhost:5050/storage/:path*',
      },
    ];
  },
};

export default nextConfig;
