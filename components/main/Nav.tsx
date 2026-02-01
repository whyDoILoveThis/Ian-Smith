"use client";
import { ThemeToggler } from "@/components/Theme/ThemeToggler";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ITSLogo from "../sub/ItsLogo";
import { LINK_MY_BLOGS } from "@/lib/globals";
import LinkUnderlineAnim from "../sub/LinkUnderlineAnim";
import ItsDropdown from "@/components/ui/its-dropdown";
import { Menu, X } from "lucide-react";

const Nav = () => {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (pathname === "/cpp") setHidden(true);
    else setHidden(false);
  }, [pathname]);

  if (hidden) return null;

  return (
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
          <span className="flex gap-6 items-center translate-y-2">
            <LinkUnderlineAnim linkText="About Me" linkHref="/about-me" />
            <LinkUnderlineAnim linkText="Blogs" linkHref={LINK_MY_BLOGS} />
            <LinkUnderlineAnim linkText="C++ Zone" linkHref="/its-cpp" />
          </span>
          <ThemeToggler isMobile={false} />
        </div>
        {/* MOBILE MENU DROPDOWN */}
        <div className="md:hidden relative z-10 -translate-y-1">
          <ItsDropdown
            trigger={
              <button className="p-2 rounded-full border border-slate-200/20 dark:border-slate-700/30 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm hover:brightness-110 transition">
                <Menu className="h-6 w-6" />
              </button>
            }
            position="down-right"
            className="w-56 p-3 rounded-lg shadow-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/10 dark:border-slate-800/50 flex flex-col gap-2"
          >
            {/* BACKDROP LAYER */}
            <div className="relative z-[40] w-56 p-3 rounded-2xl flex flex-col gap-2">
              <Link
                href="/about-me"
                className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                About Me
              </Link>
              <Link
                href={LINK_MY_BLOGS}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Blogs
              </Link>
              <Link
                href="/its-cpp"
                className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                C++ Zone
              </Link>
            </div>
            <span className="z-[40] relative">
              <ThemeToggler isMobile={true} />
            </span>{" "}
            <div className="absolute rounded-lg inset-0 backdrop-blur-md pointer-events-none z-[10]" />
          </ItsDropdown>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
