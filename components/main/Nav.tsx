"use client";
import { ThemeToggler } from "@/components/Theme/ThemeToggler";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ITSLogo from "../sub/ItsLogo";
import LinkUnderlineAnim from "../sub/LinkUnderlineAnim";
import ItsDropdown from "@/components/ui/its-dropdown";
import { Menu, X } from "lucide-react";
import { LINKS } from "@/lib/Links";

const Nav = () => {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (pathname === "/cpp") setHidden(true);
    else setHidden(false);
  }, [pathname]);

  if (hidden) return null;

  return (
    <article className="h-16">
      <nav className="zz-top fixed top-0 left-0 w-full border-b flex justify-center">
        <div className="flex justify-between max-w-[800px] w-full items-center p-2 pb-0 pr-6">
          {/* BACKDROP LAYER */}
          <div className="absolute inset-0  bg-white/20 dark:bg-slate-900/50 backdrop-blur-md pointer-events-none z-0" />
          <Link
            className="font-bold translate-y-1.5 text-2xl relative z-10"
            href={"/"}
          >
            <ITSLogo />
          </Link>
          {/* DESKTOP LINKS */}
          <div className="hidden md:flex gap-6 items-center relative z-10">
            <span className="flex gap-6 max-w-[280px] overflow-x-scroll chat-scroll left-0 items-center">
              {LINKS.map((link) => (
                <LinkUnderlineAnim
                  key={link.name}
                  linkText={link.name}
                  linkHref={link.href}
                />
              ))}
            </span>
            <ThemeToggler isMobile={false} />
          </div>
          {/* MOBILE MENU DROPDOWN */}
          <div className="md:hidden relative z-10">
            <ItsDropdown
              trigger={
                <button className="p-2 rounded-full border border-slate-200/20 dark:border-slate-700/30 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm hover:brightness-110 transition">
                  <Menu className="h-6 w-6" />
                </button>
              }
              position="down-right"
              className="!fixed !top-14 !left-0 !right-0 !w-screen !rounded-none p-3 shadow-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/10 dark:border-slate-800/50 flex flex-col gap-2"
            >
              {/* BACKDROP LAYER */}
              <div className="relative z-[40] w-full p-3 rounded-2xl flex flex-col gap-2">
                {LINKS.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="group flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-white/10 dark:border-slate-700/40 bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-800/60 dark:to-slate-800/20 shadow-sm hover:shadow-md hover:from-white/60 hover:to-white/20 dark:hover:from-slate-700/60 dark:hover:to-slate-800/30 transition-all duration-200"
                  >
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                      {link.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {link.tagline}
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
