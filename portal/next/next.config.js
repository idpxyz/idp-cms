const path = require('path');

module.exports = { 
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://authoring:8000/api/:path*', // Use Docker service name
      },
    ];
  },
};
