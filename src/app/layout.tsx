import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINE Dashboard Bot",
  description: "Serverless LINE Bot with Google Sheets Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
