import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Virtual Try-On (Inpainting)",
  description: "Upload your photo, select region, and try on clothes via Hugging Face inpainting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
