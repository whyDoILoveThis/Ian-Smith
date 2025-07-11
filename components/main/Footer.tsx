import React from "react";
import Link from "next/link";
import FacebookIcon from "../sub/FacebookIcon";
import GithubIcon from "../sub/GithubIcon";
import { SignInButton } from "@clerk/nextjs";
import DoubleSecretLogin from "../sub/Secret/DoubleSecretLogin";

const Footer = () => {
  return (
    <footer className="w-full flex flex-col items-center p-4 pt-12 border-t bg-slate-900 bg-blur-10">
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
