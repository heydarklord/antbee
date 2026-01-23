import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider"
import Providers from "@/components/providers"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MockAPI SaaS",
  description: "API mocking and request inspection platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <div className="bg-red-600 text-white text-center py-2 px-4 font-bold animate-pulse sticky top-0 z-[100]">
            ⚠️ CONFIGURATION MISSING: Please add NEXT_PUBLIC_SUPABASE_URL to your .env.local file
          </div>
        )}
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
