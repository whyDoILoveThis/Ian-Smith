"use client";
import { ThemeToggler } from "@/components/Theme/ThemeToggler";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ITSLogo from "../sub/ItsLogo";
import { LINK_MY_BLOGS } from "@/lib/globals";
import LinkUnderlineAnim from "../sub/LinkUnderlineAnim";

const Nav = () => {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Hide nav if route is /cpp
    if (pathname === "/cpp") {
      setHidden(true);
    } else {
      setHidden(false);
    }
  }, [pathname]);

  if (hidden) return null;

  return (
    <nav className="zz-top fixed top-0 w-full max-w-[800px] flex justify-between items-center p-2 pb-0 pr-6 border-b bg-blur-10">
      <Link className="font-bold text-2xl" href={"/"}>
        <ITSLogo />
      </Link>
      <div className="flex gap-6 items-center">
        <span className="flex gap-6 items-center translate-y-2">
          <LinkUnderlineAnim linkText="About Me" linkHref="/about-me" />
          <LinkUnderlineAnim linkText="Blogs" linkHref={LINK_MY_BLOGS} />
          <LinkUnderlineAnim linkText="C++ Zone" linkHref="/its-cpp" />
        </span>
        <ThemeToggler />
      </div>
    </nav>
  );
};

export default Nav;
