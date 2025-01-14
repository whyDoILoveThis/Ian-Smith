import React from "react";
import Link from "next/link";
import FacebookIcon from "../sub/FacebookIcon";
import GithubIcon from "../sub/GithubIcon";
import { SignInButton } from "@clerk/nextjs";

const Footer = () => {
  return (
    <footer className="w-full flex flex-col items-center p-4 border-t bg-blur-10">
      <div className="flex gap-4 mb-2">
        <Link href={"https://facebook.com"}>
          <FacebookIcon />
        </Link>
        <Link href={"https://github.com"}>
          <GithubIcon />
        </Link>
      </div>
      <p className="text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Ian Thai Smith. All rights reserved.
      </p>
      <div className="bg-white opacity-0 absolute bottom-0 left-0 w-[20px] h-[20px]">
        {" "}
        <span className=" [&>*]:cursor-default ">
          <SignInButton mode="modal" />
        </span>
      </div>
    </footer>
  );
};

export default Footer;
