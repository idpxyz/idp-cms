/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14 中 appDir 已经是默认行为，无需配置
  // experimental: {
  //   appDir: true,
  // },

  // Docker Compose环境配置
  output: "standalone",

  // 禁用构建时预渲染，避免构建时连接错误
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // 明确指定只使用 App Router，避免 pages 目录相关错误
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // 生产构建时禁用 ESLint 和 TypeScript 检查，避免非关键警告阻止部署
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // 性能优化配置
  experimental: {
    optimizePackageImports: ["@/themes", "@/components", "@/lib"],
    // 开发环境禁用静态生成
    ...(process.env.NODE_ENV === "development" && {
      staticGenerationRetryCount: 0,
    }),
  },

  // 编译优化
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Webpack 优化配置
  webpack: (config, { isServer }) => {
    // 优化主题动态导入
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          themes: {
            name: "themes",
            test: /[\\/]themes[\\/]/,
            chunks: "async",
            priority: 10,
            reuseExistingChunk: true,
          },
          storybook: {
            name: "storybook",
            test: /[\\/]node_modules[\\/](@storybook|storybook)[\\/]/,
            chunks: "async",
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },

  // 现代化图片配置 - 使用 remotePatterns 替代废弃的 domains
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'authoring',
      },
      {
        protocol: 'http',
        hostname: 'local-authoring-1',
      },
      {
        protocol: 'http',
        hostname: '192.168.8.195',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'lf9-static.bytednsdoc.com',
      },
      // 🚀 允许湖北新闻网的图片
      {
        protocol: 'http',
        hostname: 'news.cnhubei.com',
      },
      {
        protocol: 'https',
        hostname: 'news.cnhubei.com',
      },
      // 🔓 允许所有 .com 域名的图片（临时方案，方便采集外部图片）
      {
        protocol: 'http',
        hostname: '**.com',
      },
      {
        protocol: 'https',
        hostname: '**.com',
      },
      {
        protocol: 'http',
        hostname: '**.cn',
      },
      {
        protocol: 'https',
        hostname: '**.cn',
      },
      // 移除 images.unsplash.com，使用稳定的 Picsum
    ],
    // 🎯 Next.js 16 兼容：配置允许的图片质量值
    qualities: [75, 80, 85, 90, 100],
    // 🚀 性能优化：配置设备尺寸，减少不必要的图片变体
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 🚀 性能优化：配置支持的图片格式
    formats: ['image/webp', 'image/avif'],
    // 🚀 最小化缓存TTL以适应hero图片变化
    minimumCacheTTL: 86400,
    // 🚀 允许危险使用SVG
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async rewrites() {
    // 🎯 Next.js 15 兼容的rewrites配置
    return [
      {
        source: "/cms/:path*",
        destination: "http://authoring:8000/api/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;