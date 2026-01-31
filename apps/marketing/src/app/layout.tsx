import "./globals.css";
import type { Metadata } from "next";
import SiteNav from "./_components/SiteNav";
import SiteFooter from "./_components/SiteFooter";

export const metadata: Metadata = {
  title: "Hi5Tech Platform",
  description: "ITSM + RMM platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="site-shell">
          <SiteNav appUrl={appUrl} />
          <main className="site-main">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
