/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'pdfkit'],
  outputFileTracingIncludes: {
    '/api/report': [
      './node_modules/pdfkit/js/data/*.afm',
      './node_modules/pdfkit/js/standard-fonts/*.cjs',
    ],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  transpilePackages: ["@react-pdf/renderer"],
};

export default nextConfig;