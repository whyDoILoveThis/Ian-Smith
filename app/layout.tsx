import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/ItsBtn.css";
import { ThemeProvider } from "@/components/Theme/ThemeProvider";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
} from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import Nav from "@/components/main/Nav";
import CMS from "@/components/CMS/CMS";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
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
            <main className="mt-16 flex flex-col items-center">
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <Nav />

                <CMS />

                <Toaster />
              </ThemeProvider>
            </main>
          </SignedIn>
          <SignedOut>
            <main className="mt-16 flex flex-col items-center">
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <Nav />
                <div className="w-full max-w-[800px]">{children}</div>
              </ThemeProvider>
            </main>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
