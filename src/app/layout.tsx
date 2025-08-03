import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { ProgressProvider } from "@/components/providers/ProgressProvider";
import { MessagingProvider } from "@/contexts/MessagingContext";

// Debug utilities (development only)
if (process.env.NODE_ENV === 'development') {
  import("@/lib/auth-debug");
  import("@/lib/loading-debug");
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agora - e4 Labs",
  description: "Basit. Hızlı. İletişim.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <LoadingProvider>
            <MessagingProvider>
              <ProgressProvider>
                {children}
              </ProgressProvider>
            </MessagingProvider>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
