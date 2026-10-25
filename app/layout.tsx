import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GS Pen Test Lab",
  description: "Private native-caption research and data-minimized diagnostics.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
