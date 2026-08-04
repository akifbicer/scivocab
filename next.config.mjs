import path from 'path';

const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve('./'),
    };
    return config;
  },
};

export default nextConfig;
