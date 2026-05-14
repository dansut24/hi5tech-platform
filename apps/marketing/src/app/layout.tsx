import type { Metadata } from "next";
import "./globals.css";
import SiteNav from "./_components/SiteNav";
import SiteFooter from "./_components/SiteFooter";

export const metadata: Metadata = {
  title: "Hi5Tech | Modern Service Desk & Endpoint Management",
  description:
    "Modern ITSM with integrated endpoint visibility and premium remote management tools.",
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.hi5tech.co.uk";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <SiteNav appUrl={appUrl} />
          <main className="site-main">{children}</main>
          <SiteFooter appUrl={appUrl} />
        </div>
      </body>
    </html>
  );
}
