"use client";

import Link from "next/link";
import React from "react";
import { useNavFooterTheme } from "../main/NavFooterTheme";

interface Props {
  linkText: string;
  linkHref: string;
}

const LinkUnderlineAnim = ({ linkText, linkHref }: Props) => {
  const theme = useNavFooterTheme();
  const isBlack = theme === "black";

  return (
    <Link
      href={linkHref}
      target="_blank"
      className={`text-[13px] place-self-start font-medium tracking-wide ${isBlack ? "dark:text-gray-400 text-gray-500" : "dark:text-slate-400 text-slate-500"} relative group`}
    >
      <span
        className={`relative z-10 transition-colors text-nowrap duration-300 group-hover:dark:text-white ${isBlack ? "group-hover:text-gray-200" : "group-hover:text-slate-800"}`}
      >
        {linkText}
      </span>
      {/* Gradient underline hover effect */}
      <span
        className="absolute left-0 bottom-0 h-0.5 w-full scale-x-0 
                     bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-400 
                     transition-transform duration-300 group-hover:scale-x-100"
      />
    </Link>
  );
};

export default LinkUnderlineAnim;
