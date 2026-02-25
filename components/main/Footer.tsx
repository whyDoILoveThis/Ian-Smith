"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import FacebookIcon from "../sub/FacebookIcon";
import GithubIcon from "../sub/GithubIcon";
import { SignInButton } from "@clerk/nextjs";
import DoubleSecretLogin from "../sub/Secret/DoubleSecretLogin";
import ITSLogo from "../sub/ItsLogo";
import LinkUnderlineAnim from "../sub/LinkUnderlineAnim";
import { LINK_MY_BLOGS } from "@/lib/globals";
import { appwrGetSecurityFlag } from "@/appwrite/appwrUpdateSecurity";
import { SecurityToggle } from "../CMS/CMS";
import RunningPuppy from "../sub/RunningPuppy";

const Footer = () => {
  const [isSecurityMaxed, setIsSecurityMaxed] = useState(true);
  const [toggledSecurity, setToggledSecurity] = useState(false);
  const [showSecurityBanner, setShowSecurityBanner] = useState(false);

  useEffect(() => {
    const g = async () => {
      setIsSecurityMaxed(await appwrGetSecurityFlag());
      setShowSecurityBanner(!(await appwrGetSecurityFlag()));
    };

    g();
  }, [toggledSecurity]);

  useEffect(() => {
    if (!isSecurityMaxed && !showSecurityBanner) {
      setTimeout(() => {
        setShowSecurityBanner(true);
      }, 400000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSecurityBanner]);

  return (
    <article className="w-full flex justify-center mt-16">
      <div className="h-40 opacity-0" />
      <footer className="absolute bottom-0 left-0 w-full flex flex-col gap-4 items-center p-4 border-t border-slate-500 bg-slate-200 dark:bg-slate-900">
        <Link className="absolute left-0 top-2 font-bold text-2xl" href={"/"}>
          <ITSLogo />
        </Link>
        <div className="flex items-center gap-6 flex-wrap mb-8 mt-10">
          <LinkUnderlineAnim linkText="About Me" linkHref="/about-me" />
          <LinkUnderlineAnim linkText="Blogs" linkHref={LINK_MY_BLOGS} />
          <LinkUnderlineAnim linkText="C++ Zone" linkHref="/its-cpp" />
          <LinkUnderlineAnim linkText="Time" linkHref="/its-time" />
        </div>
        <div className="flex items-center gap-4 mb-2">
          <Link className="text-[28px]" href={"https://facebook.com"}>
            <FacebookIcon />
          </Link>
          <Link className="text-2xl" href={"https://github.com"}>
            <GithubIcon />
          </Link>
        </div>
        {isSecurityMaxed ? (
          <DoubleSecretLogin />
        ) : (
          <div>
            <span className="absolute left-0 bottom-0 opacity-0">
              <SignInButton mode="modal" />
            </span>
            <span onClick={() => setToggledSecurity(!toggledSecurity)}>
              <SecurityToggle setHasBeenToggled={setToggledSecurity} />
            </span>

            {/** Security banner */}
            <span
              onClick={() => {
                if (!showSecurityBanner) {
                  setShowSecurityBanner(true);
                }
              }}
              className={`${!showSecurityBanner ? "-translate-x-64 cursor-pointer" : ""} transition-all fixed flex gap-2 backdrop-blur-md zz-top-plus2 left-0 top-20 btn-red p-2 pl-2 pr-4 rounded-tr-lg rounded-br-lg text-[10px] select-none border border-l-0 border-red-400 `}
            >
              ⚠️
              <span className="translate-y-[1.5px]">
                SECURITY IS CURRENTLY LOOSE ASF
              </span>
              ⚠️
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSecurityBanner(false);
                }}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                ✖
              </button>
            </span>
          </div>
        )}
        <p className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Ian Thai Smith. All rights reserved.
        </p>
      </footer>
    </article>
  );
};

export default Footer;
