import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ember Vault",
  description: "Local encrypted vault with KOGRAPH.INT"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
