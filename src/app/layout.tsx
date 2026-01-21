import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { ProgressProvider } from "@/components/providers/ProgressProvider";
import NoSSR from "@/components/ui/NoSSR";
import "@/lib/runtimeGuards";

// Debug utilities (development only)
if (process.env.NODE_ENV === 'development') {
  import("@/lib/auth-debug");
  import("@/lib/loading-debug");
}

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
        className="antialiased"
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
