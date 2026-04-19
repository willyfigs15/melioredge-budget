/** @type {import('next').NextConfig} */
const { version } = require('./package.json');

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3002',
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

module.exports = nextConfig;
