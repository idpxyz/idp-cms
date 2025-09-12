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

  // 允许外部图片域名
  images: {
    domains: ["localhost", "local-authoring-1", "picsum.photos"],
  },

  async rewrites() {
    return [
      {
        source: "/cms/:path*",
        destination: `${
          process.env.CMS_ORIGIN || "http://local-authoring-1:8000"
        }/api/:path*`,
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
