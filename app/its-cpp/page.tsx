"use client";

import React from "react";
import Link from "next/link";
import CapsCoolerDemo from "@/components/main/cpp/CapsCoolerDemo";
import SoftwarePage from "@/components/main/cpp/CppAppPage";
import { softwareThemes } from "@/components/main/cpp/softwareThemes";
import Image from "next/image";
import CapsCoolerTrayScreenshot from "@/images/screenshot--CapsCoolerTray.png";
import WinrarIcon from "@/images/png-transparent-winrar-icon.png";
import ExeIcon from "@/images/icon--windows_exe.png";
import CapsCoolerIcon from "@/images/icon--caps-cooler.ico";

export default function Cpp() {
  const theme = softwareThemes.xp;

  const CppItsLogo = () => {
    return (
      <Link href="/" className={`${theme.navbarLink} font-bold text-2xl`}>
        ITS++
      </Link>
    );
  };

  return (
    <main className={`min-h-screen flex flex-col ${theme.container}`}>
      {/* 🔝 NAVBAR */}
      <nav className={`${theme.navbar} px-4 flex items-center justify-between`}>
        <CppItsLogo />
        <div className="flex gap-2">
          <Link href="/about-me" className={theme.navbarLink}>
            ℹ️ About
          </Link>
          <Link
            href="http://its-ians-blog.vercel.app/user/user_2iqJuHsepKWDsGxo2o6rczQpvYq"
            className={theme.navbarLink}
          >
            📝 Blog
          </Link>
        </div>
      </nav>

      {/* 📦 CONTENT */}
      <div className="p-8">
        <SoftwarePage
          demo={
            <div>
              <CapsCoolerDemo />
              <div className="mt-8">
                <div className="font-bold text-xl">
                  Installation instructions
                </div>
                <p className="mt-8">The download gives you a zip file</p>
                <a
                  href="/ITSCapsCooler-V1.zip"
                  className="relative flex gap-1 hover:bg-black/30 w-fit"
                >
                  <Image
                    src={WinrarIcon}
                    alt="CapsCooler File Screenshot"
                    width={24}
                    height={24}
                  />
                  <span className="bottom-0 self-end leading-none">
                    ITSCapsCooler-V1{" "}
                    <span className="text-sm leading-none text-slate-500">
                      999KB
                    </span>
                  </span>
                </a>
                <p className="mt-8">
                  Inside the zip file you will find CapsCooler.exe
                </p>
                <div className="relative flex gap-1">
                  <Image
                    src={ExeIcon}
                    alt="CapsCooler File Screenshot"
                    width={24}
                    height={24}
                  />
                  <span className="bottom-0 self-end leading-none">
                    CapsCooler.exe
                  </span>
                </div>
                <p className="mt-8">
                  After running the exe, check your system tray for the
                  CapsCooler icon
                </p>
                <span className="flex items-center gap-2">
                  <Image
                    className="rounded-sm"
                    width={200}
                    height={150}
                    src={CapsCoolerTrayScreenshot}
                    alt={"icon"}
                  />
                  <Image
                    width={50}
                    height={20}
                    src={CapsCoolerIcon}
                    alt={"icon"}
                  />
                </span>
                <p>If you see the icon in the tray, it&apos;s working!</p>
                <p className="mt-8">
                  💡If you open the config.txt inside the zip, the number found
                  there controls the millisecond delay before Caps Lock is
                  disabled.{" "}
                  <span className="font-bold">
                    CapsCooler must be restarted for config changes to take
                    effect!
                  </span>
                </p>
              </div>
            </div>
          }
          title="CapsCooler"
          description="Automatically disables Caps Lock after a set period of inactivity, helping to prevent accidental typing in all caps."
          downloadLink="/ITSCapsCooler-V1.zip"
          fileSize="999KB"
          screenshot={CapsCoolerTrayScreenshot}
          theme={theme}
          features={[
            "Auto-disable Caps Lock",
            "Custom timer settings",
            "Runs silently in tray",
            "Tiny memory footprint",
          ]}
        />
      </div>

      {/* 🦶 FOOTER */}
      <footer
        className={`${theme.navbar} absolute h-44 bottom-0 left-0 right-0 py-4 flex flex-col md:flex-row items-center justify-between text-sm`}
      >
        <span className="self-start">
          <CppItsLogo />
        </span>
        <div className="flex gap-4">
          <Link href="/" className={theme.navbarLink}>
            🏠 Home
          </Link>
          <Link href="/about-me" className={theme.navbarLink}>
            ℹ️ About
          </Link>
          <Link
            href="http://its-ians-blog.vercel.app/user/user_2iqJuHsepKWDsGxo2o6rczQpvYq"
            className={theme.navbarLink}
          >
            📝 Blog
          </Link>
        </div>
        <span className="opacity-80">
          © {new Date().getFullYear()} ITS • Built with 💾 & ☕
        </span>
      </footer>
    </main>
  );
}
