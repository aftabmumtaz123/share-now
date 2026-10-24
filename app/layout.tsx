import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeRuntime from "@/components/theme-runtime";
export const metadata: Metadata = { title: "DevStak — Private Workspace", description: "Private messaging and file sharing, organized simply." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", maximumScale: 5 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ThemeRuntime />{children}</body></html>;
}
