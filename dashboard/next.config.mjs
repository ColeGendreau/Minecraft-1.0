/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for containerized deployment
  output: 'standalone',
  
  // Disable image optimization for simpler deployment
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
