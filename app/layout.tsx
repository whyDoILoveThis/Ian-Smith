import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/ItsBtn.css";
import "@/styles/Clerk.css";
import "@/styles/ItsTooltip.css";
import "@/styles/ItsTextShadow.css";
import { ThemeProvider } from "@/components/Theme/ThemeProvider";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import CMS from "@/components/CMS/CMS";
import Footer from "@/components/main/Footer";
import ConnectivityWrapper from "@/components/main/ConnectivityWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ian Smith",
  description: "Ian Thai Smith's personal website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <SignedIn>
            <ConnectivityWrapper>
              <main className="flex flex-col items-center">
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  <CMS />
                  <Toaster />
                  <Footer />
                </ThemeProvider>
              </main>
            </ConnectivityWrapper>
          </SignedIn>
          <SignedOut>
            <ConnectivityWrapper>
              <main className="flex flex-col items-center">
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  <div className="w-full max-w-[800px]">{children}</div>
                  <Footer />
                </ThemeProvider>
              </main>
            </ConnectivityWrapper>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
