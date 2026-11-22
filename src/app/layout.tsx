import type { Metadata } from "next";
import Providers from "./providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zalo",
  description: "Nhắn tin, kết nối và chia sẻ cùng bạn bè trên Zalo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body style={{ margin: "0px" }} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
