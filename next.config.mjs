
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'pdfkit'],
  outputFileTracingIncludes: {
    '/api/report': [
      // Trace the entire pdfkit/js folder – this covers data, standard-fonts, and chunks
      './node_modules/pdfkit/js/**/*',
    ],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
