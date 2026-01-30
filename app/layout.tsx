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
  const iansUserId = process.env.NEXT_PUBLIC_IANS_CLERK_USERID;

  const MainSiteContent = () => {
    return <div className="w-full max-w-[800px]">{children}</div>;
  };
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`relative pb-44 min-h-screen
           ${inter.className}`}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SignedIn>
              <ConnectivityWrapper>
                <main className="flex flex-col items-center">
                  <div id="portal-root-0"></div>
                  <SignedInJSX adminUserId={iansUserId}>{children}</SignedInJSX>
                </main>
              </ConnectivityWrapper>
            </SignedIn>
            <SignedOut>
              <ConnectivityWrapper>
                <main className="flex flex-col items-center">
                  <div id="portal-root-0"></div>
                  <MainSiteContent />
                </main>
              </ConnectivityWrapper>
            </SignedOut>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
