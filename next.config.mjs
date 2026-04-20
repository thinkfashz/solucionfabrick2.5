/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.platform === 'win32' ? {} : { output: 'standalone' }),
};

export default nextConfig;
