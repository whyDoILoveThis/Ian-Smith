import Link from "next/link";
import React from "react";

interface Props {
  linkText: string;
  linkHref: string;
}

const LinkUnderlineAnim = ({ linkText, linkHref }: Props) => {
  return (
    <Link
      href={linkHref}
      className="text-lg place-self-start mb-4 font-semibold tracking-wide dark:text-slate-200 
              text-slate-800     relative group"
    >
      <span className="relative z-10 transition-colors text-nowrap duration-300 group-hover:dark:text-white group-hover:text-slate-500">
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
