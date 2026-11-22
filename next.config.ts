import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trỏ Turbopack về đúng thư mục dự án để tránh cảnh báo workspace root
  // (do có package-lock.json ở thư mục cha C:\Users\ADMIN).
  turbopack: {
    root: process.cwd(),
  },

  allowedDevOrigins: ["192.168.1.59"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zalo-site.zadn.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "stc-zaloprofile.zdn.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "stc-zlogin.zdn.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "chat.zalo.me",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'avatar.iran.liara.run',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.vecteezy.com',
        pathname: '/**',
      },
    ],
  },

  // ===== Proxy API để né CORS =====
  // Dùng chung env với client để khi đổi backend (local / Cloudflare Tunnel)
  // chỉ cần sửa 1 biến, không còn hardcode localhost:4321.
  async rewrites() {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "https://breezy-oblong-chip.ngrok-free.dev";
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;