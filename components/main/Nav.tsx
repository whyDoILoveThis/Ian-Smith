"use client";
import { ThemeToggler } from "@/components/Theme/ThemeToggler";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
    <nav className="zz-top fixed top-0 left-0 w-screen max-w-[800px] flex justify-between items-center p-2 px-6 border-b bg-blur-10">
      <Link className="font-bold text-2xl" href={"/"}>
        ITS
      </Link>
      <div className="flex gap-6 items-center">
        <Link className="hover:underline" href={"/about-me"}>
          About Me
        </Link>
        <Link
          className="hover:underline"
          target="_blank"
          href={
            "http://its-ians-blog.vercel.app/user/user_2iqJuHsepKWDsGxo2o6rczQpvYq"
          }
        >
          Blog
        </Link>
        <Link className="hover:underline" target="_blank" href={"/cpp"}>
          C++ Zone
        </Link>
        <ThemeToggler />
      </div>
    </nav>
  );
};

export default Nav;
