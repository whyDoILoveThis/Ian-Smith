"use client";
import { ThemeToggler } from "@/components/Theme/ThemeToggler";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ITSLogo from "../sub/ItsLogo";
import LinkUnderlineAnim from "../sub/LinkUnderlineAnim";
import ItsDropdown from "@/components/ui/its-dropdown";
import { Menu, X, Settings, Sparkles, Snail } from "lucide-react";
import { LINKS } from "@/lib/Links";
import { useNavFooterTheme } from "./NavFooterTheme";
//import { useOrbSettings } from "@/components/ItsGlowingOrbs/OrbSettingsContext";

const Nav = () => {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const theme = useNavFooterTheme();
  const isBlack = theme === "black";
  // const { setShowDashboard, resetSpeeds } = useOrbSettings();

  useEffect(() => {
    if (pathname === "/cpp") setHidden(true);
    else setHidden(false);
  }, [pathname]);

  if (hidden) return null;

  return (
    <article className="h-16">
      <nav
        className={`zz-top fixed top-0 left-0 w-full border-b ${isBlack ? "dark:border-gray-800/50" : ""} flex justify-center`}
      >
        <div className="flex justify-between max-w-[800px] w-full items-center p-2 pb-0 pr-6">
          {/* BACKDROP LAYER */}
          <div
            className={`absolute inset-0 bg-white/20 ${isBlack ? "dark:bg-black/70" : "dark:bg-slate-900/50"} backdrop-blur-md pointer-events-none z-0`}
          />
          <Link
            className="font-bold translate-y-1.5 text-2xl relative z-10"
            href={"/"}
          >
            <ITSLogo />
          </Link>
          {/* DESKTOP LINKS */}
          <div className="hidden md:flex gap-6 items-center relative z-10">
            <span className="flex gap-5 max-w-[280px] overflow-x-scroll nav-scroll left-0 items-center">
              {LINKS.map((link) => (
                <LinkUnderlineAnim
                  key={link.name}
                  linkText={link.name}
                  linkHref={link.href}
                />
              ))}
            </span>
            <ThemeToggler isMobile={false} />
            {/* <ItsDropdown
              trigger={
                <button
                  className={`p-2 rounded-full border border-slate-200/20 ${isBlack ? "dark:border-gray-700/30" : "dark:border-slate-700/30"} bg-white/30 ${isBlack ? "dark:bg-gray-900/30" : "dark:bg-slate-800/30"} backdrop-blur-sm hover:brightness-110 transition`}
                >
                  <Settings className="h-4 w-4" />
                </button>
              }
              position="down-right"
              closeWhenItemClick
              className="!w-56"
            >
              <button
                onClick={() => setShowDashboard(true)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-neutral-700 dark:text-neutral-200 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-300 transition-all"
              >
                <Sparkles className="w-4 h-4 text-violet-500" />
                Floating Orb Settings
              </button>
              <button
                onClick={() => resetSpeeds()}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-neutral-700 dark:text-neutral-200 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-300 transition-all"
              >
                <Snail className="w-4 h-4 text-blue-500" />
                Slow Orbs
              </button>
            </ItsDropdown> */}
          </div>
          {/* MOBILE MENU DROPDOWN */}
          <div className="md:hidden relative z-10">
            <ItsDropdown
              trigger={
                <button
                  className={`p-2 rounded-full border border-slate-200/20 ${isBlack ? "dark:border-gray-700/30" : "dark:border-slate-700/30"} bg-white/30 ${isBlack ? "dark:bg-gray-900/30" : "dark:bg-slate-800/30"} backdrop-blur-sm hover:brightness-110 transition`}
                >
                  <Menu className="h-6 w-6" />
                </button>
              }
              position="down-right"
              className={`!fixed !top-14 !left-0 !right-0 !w-screen !rounded-none p-3 shadow-xl bg-white/70 ${isBlack ? "dark:bg-black/70" : "dark:bg-slate-900/70"} border-b border-slate-200/10 ${isBlack ? "dark:border-gray-800/50" : "dark:border-slate-800/50"} flex flex-col gap-2`}
            >
              {/* BACKDROP LAYER */}
              <div className="relative z-[40] w-full p-3 rounded-2xl flex flex-col gap-1.5">
                {LINKS.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    target={link.target}
                    rel={
                      link.target === "_blank"
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className={`group relative flex items-center justify-between px-4 py-3.5 rounded-2xl border border-slate-200/60 ${isBlack ? "dark:border-gray-800/30" : "dark:border-slate-700/30"} bg-white/50 ${isBlack ? "dark:bg-gray-900/40" : "dark:bg-slate-800/40"} shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-white/80 ${isBlack ? "dark:hover:bg-gray-800/50" : "dark:hover:bg-slate-700/50"} hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 ease-out`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-medium tracking-tight text-slate-900 dark:text-slate-50">
                        {link.name}
                      </span>
                      <span
                        className={`text-[11px] text-slate-400 ${isBlack ? "dark:text-gray-500" : "dark:text-slate-500"} font-normal`}
                      >
                        {link.tagline}
                      </span>
                    </div>
                    <span
                      className={`text-slate-300 ${isBlack ? "dark:text-gray-600" : "dark:text-slate-600"} group-hover:text-slate-400 ${isBlack ? "dark:group-hover:text-gray-400" : "dark:group-hover:text-slate-400"} group-hover:translate-x-0.5 transition-all duration-200 text-sm`}
                    >
                      ›
                    </span>
                  </Link>
                ))}
              </div>
              <span className="z-[40] relative">
                <ThemeToggler isMobile={true} />
              </span>{" "}
              <div className="absolute rounded-lg inset-0 backdrop-blur-md pointer-events-none z-[10]" />
            </ItsDropdown>
          </div>
        </div>
      </nav>
    </article>
  );
};

export default Nav;
