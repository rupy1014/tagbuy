/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'instagram.com',
      },
      {
        protocol: 'https',
        hostname: 'tagbyimg.s3.ap-northeast-2.amazonaws.com',
      },
    ],
  },
  async rewrites() {
    // Docker 환경에서는 서비스 이름 사용, 로컬에서는 localhost 사용
    const apiHost = process.env.NODE_ENV === 'production'
      ? 'http://api:8000'
      : (process.env.API_INTERNAL_URL || 'http://api:8000');

    return [
      {
        source: '/api/:path*',
        destination: `${apiHost}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
