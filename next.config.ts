import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  // 允许开发环境跨域访问
  allowedDevOrigins: ['111.186.56.118', 'cyberc3-cloud-server.sjtu.edu.cn'],
  // 重写规则，将 /livekit/* 代理到本地 LiveKit 服务器
  async rewrites() {
    return [
      {
        source: '/livekit/:path*',
        destination: 'http://localhost:7880/:path*',
      },
    ];
  },
};

export default nextConfig;
