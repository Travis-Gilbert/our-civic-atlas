import type { Metadata } from "next";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flint Atlas | Our Civic Atlas",
  description:
    "The Flint city node in Our Civic Atlas, built around source-grounded maps, evidence, and community contribution.",
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
