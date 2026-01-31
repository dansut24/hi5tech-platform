import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hi5Tech Platform",
  description: "ITSM + RMM platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
