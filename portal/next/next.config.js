const path = require('path');

module.exports = {
  reactStrictMode: true,

  // 页面缓存策略配置
  experimental: {
    // Next.js 15+ 中 ISR 缓存配置已优化，无需手动设置
  },

  // 静态资源缓存配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=120, stale-while-revalidate=60',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=120, stale-while-revalidate=60',
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    };
    return config;
  },

  async rewrites() {
    // 智能环境检测和API代理配置
    const getApiBaseUrl = () => {
      // 优先使用环境变量
      if (process.env.DJANGO_API_URL) {
        return process.env.DJANGO_API_URL;
      }

      // Docker环境检测 - 更准确的检测方法
      const isDocker =
        process.env.NODE_ENV === 'production' ||
        process.env.NEXT_RUNTIME === 'docker' ||
        process.env.DOCKER_ENV === 'true' ||
        process.env.HOSTNAME || // Docker容器通常会设置HOSTNAME
        process.env.PWD?.includes('/app'); // Docker容器中的工作目录

      if (isDocker) {
        // 在Docker Compose环境中，使用服务名访问
        // 这样可以避免硬编码IP地址，让Docker DNS解析服务名
        return 'http://authoring:8000';
      }

      // 开发环境fallback
      return process.env.DEV_API_URL || 'http://localhost:8000';
    };

    const apiBaseUrl = getApiBaseUrl();
    console.log(
      `🔗 API Proxy: ${apiBaseUrl} (Docker: ${!!process.env.HOSTNAME}, PWD: ${process.env.PWD})`
    );

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};
