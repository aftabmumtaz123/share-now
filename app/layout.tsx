import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "DevStak — Private Workspace", description: "Private messaging and file sharing, organized simply." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
