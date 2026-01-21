import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages
  output: 'export',
  
  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
  
  // Trailing slashes for better static hosting compatibility
  trailingSlash: true,
  
  // Exclude dynamic routes from static export - handle them client-side only
  // This works because project IDs are stored in IndexedDB, not fetched from a server
  experimental: {
    // Enable client-side navigation for dynamic routes
  },
};

export default nextConfig;
