import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simple uptime monitor",
  description:
    "Self-hosted tool for monitoring your websites and APIs, with HTTP notifications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
