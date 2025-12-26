import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { ProgressProvider } from "@/components/providers/ProgressProvider";
import NoSSR from "@/components/ui/NoSSR";

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
  title: "Agora",
  description: "Basit. Hızlı. İletişim.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <LoadingProvider>
            {/* <ProgressProvider> */}
            <NoSSR>
              {children}
            </NoSSR>
            {/* </ProgressProvider> */}
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}