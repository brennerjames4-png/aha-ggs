import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AHA GGs - GeoGuessr Daily Challenge Tracker",
  description: "Where in the world are your points? Competitive daily GeoGuessr challenge tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen topo-bg antialiased">
        {children}
      </body>
    </html>
  );
}
