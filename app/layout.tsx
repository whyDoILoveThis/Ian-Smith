// RTDB tracker must be imported FIRST so its WebSocket proxy is in place before Firebase connects
import FirebaseRTDBTrackerOverlayRenderer from "@/components/FirebaseRTDBTrackerOverlay/FirebaseRTDBTrackerOverlayRenderer";
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
import PerformanceOverlayRouteCheckRenderer from "@/components/PerformanceOverlay/PerformanceOverlayRoute";
import ScrollJumpButtons from "@/components/main/ScrollJumpButtons";
import VersionGuard from "@/components/main/VersionGuard";
// import { OrbSettingsProvider } from "@/components/ItsGlowingOrbs/OrbSettingsContext";
// import OrbsWithSettings from "@/components/ItsGlowingOrbs/OrbsWithSettings";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
      <html className="chat-scroll" lang="en">
        <head>
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
          <meta name="mobile-web-app-capable" content="yes" />
        </head>
        <body
          style={{
            fontFamily: `${inter.style.fontFamily}, 'Segoe UI Emoji', sans-serif`,
          }}
          className={`relative min-h-screen
           ${inter.className} ${inter.variable}`}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {/* <OrbSettingsProvider> */}
            <BreadcrumbProvider disabled>
              <FirebaseRTDBTrackerOverlayRenderer disabled />
              <PerformanceOverlayRouteCheckRenderer />
              <ScrollJumpButtons />
              {/* <OrbsWithSettings /> */}
              <VersionGuard />
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
            {/* </OrbSettingsProvider> */}
          </ThemeProvider>
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
            async
            defer
          ></script>
        </body>
      </html>
    </ClerkProvider>
  );
}
