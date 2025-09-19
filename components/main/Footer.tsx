import React from "react";
import Link from "next/link";
import FacebookIcon from "../sub/FacebookIcon";
import GithubIcon from "../sub/GithubIcon";
import { SignInButton } from "@clerk/nextjs";
import DoubleSecretLogin from "../sub/Secret/DoubleSecretLogin";
import ITSLogo from "../sub/ItsLogo";
import LinkUnderlineAnim from "../sub/LinkUnderlineAnim";
import { LINK_MY_BLOGS } from "@/lib/globals";

const Footer = () => {
  return (
    <footer className="absolute bottom-0 left-0 overflow-hidden w-full flex flex-col items-center p-4 pt-12 border-t border-slate-500 bg-slate-200 dark:bg-slate-900">
      <Link className="absolute left-0 top-2 font-bold text-2xl" href={"/"}>
        <ITSLogo />
      </Link>
      <div className="flex items-center gap-6 flex-wrap mt-8">
        <LinkUnderlineAnim linkText="Time" linkHref="/its-time" />
        <LinkUnderlineAnim linkText="About Me" linkHref="/about-me" />
        <LinkUnderlineAnim linkText="Blogs" linkHref={LINK_MY_BLOGS} />
        <LinkUnderlineAnim linkText="C++ Zone" linkHref="/its-cpp" />
      </div>
      <div className="flex items-center gap-4 mb-2">
        <Link className="text-[28px]" href={"https://facebook.com"}>
          <FacebookIcon />
        </Link>
        <Link className="text-2xl" href={"https://github.com"}>
          <GithubIcon />
        </Link>
      </div>
      <p className="text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Ian Thai Smith. All rights reserved.
      </p>
      <DoubleSecretLogin />
    </footer>
  );
};

export default Footer;
