"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import FacebookIcon from "../sub/FacebookIcon";
import GithubIcon from "../sub/GithubIcon";
import { SignInButton } from "@clerk/nextjs";
import DoubleSecretLogin from "../sub/Secret/DoubleSecretLogin";
import ITSLogo from "../sub/ItsLogo";
import LinkUnderlineAnim from "../sub/LinkUnderlineAnim";
import { appwrGetSecurityFlag } from "@/appwrite/appwrUpdateSecurity";
import { SecurityToggle } from "../CMS/CMS";
import RunningPuppy from "../sub/RunningPuppy";
import { LINKS } from "@/lib/Links";

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
      <div className="h-64 opacity-0" />
      <footer className="absolute bottom-0 left-0 w-full flex flex-col gap-6 items-center px-6 py-8 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-950">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-400 dark:via-slate-500 to-transparent" />
        <Link className="font-bold text-2xl" href={"/"}>
          <ITSLogo />
        </Link>
        <div className="flex items-center justify-center gap-x-8 gap-y-3 flex-wrap">
          {LINKS.map((link) => (
            <LinkUnderlineAnim
              key={link.name}
              linkText={link.name}
              linkHref={link.href}
            />
          ))}
        </div>
        <div className="flex items-center gap-5">
          <Link
            className="text-[26px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors duration-200"
            href={"https://facebook.com"}
          >
            <FacebookIcon />
          </Link>
          <Link
            className="text-[22px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors duration-200"
            href={"https://github.com"}
          >
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
              className={`${!showSecurityBanner ? "-translate-x-64 cursor-pointer" : ""} transition-all fixed flex gap-2 bg-red-50 dark:bg-red-950/90 zz-top-plus2 left-0 top-20 btn-red p-2 pl-2 pr-4 rounded-tr-lg rounded-br-lg text-[10px] select-none border border-l-0 border-red-400 `}
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
        <p className="text-center text-xs tracking-wide text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} Ian Thai Smith. All rights reserved.
        </p>
      </footer>
    </article>
  );
};

export default Footer;
