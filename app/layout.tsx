import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/ItsBtn.css";
import "@/styles/Clerk.css";
import "@/styles/ItsTooltip.css";
import "@/styles/ItsTextShadow.css";
import "@/styles/Scrollbars.css";
import { ThemeProvider } from "@/components/Theme/ThemeProvider";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import ConnectivityWrapper from "@/components/main/ConnectivityWrapper";
import SignedInJSX from "@/components/main/SignedInJSX";
import { MainWrap } from "@/components/main/MainWrap";
import { BreadcrumbProvider } from "@/breadcrumb";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ian Smith",
  description: "Ian Thai Smith's personal website",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ian Smith",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const AdminsUserId = process.env.NEXT_PUBLIC_IANS_CLERK_USERID;
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
          <meta name="mobile-web-app-capable" content="yes" />
        </head>
        <body
          className={`relative pb-44 min-h-screen
           ${inter.className}`}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <BreadcrumbProvider>
              <SignedIn>
                <ConnectivityWrapper>
                  <MainWrap>
                    <SignedInJSX adminUserId={AdminsUserId}>
                      {children}
                    </SignedInJSX>
                  </MainWrap>
                </ConnectivityWrapper>
              </SignedIn>
              <SignedOut>
                <ConnectivityWrapper>
                  <MainWrap>{children}</MainWrap>
                </ConnectivityWrapper>
              </SignedOut>
            </BreadcrumbProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
