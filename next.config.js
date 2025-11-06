const { withContentlayer } = require('next-contentlayer');
const path = require('path');

/**
 * @type {import('next/dist/next-server/server/config').NextConfig}
 **/
module.exports = withContentlayer({
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  eslint: {
    ignoreDuringBuilds: true,
    dirs: ['app', 'components', 'lib', 'layouts', 'scripts'],
  },
  swcMinify: true,
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@/components': path.resolve(__dirname, 'components'),
      '@/content': path.resolve(__dirname, 'content'),
      '@/layouts': path.resolve(__dirname, 'components/layouts'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/hooks': path.resolve(__dirname, 'hooks'),
      '@/css': path.resolve(__dirname, 'css'),
      '@/types': path.resolve(__dirname, 'types'),
    };

    // Asegurar que Prisma funcione correctamente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
});
