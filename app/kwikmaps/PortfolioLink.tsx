"use client";
import Link from "next/link";
import React from "react";

const PortfolioLink = () => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Link
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      href="/"
      className="block w-full text-center text-xs py-1.5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200"
    >
      <span
        className={`inline-block transition-transform duration-200 ${hovered ? "-translate-x-1" : ""}`}
      >
        ←
      </span>{" "}
      Ian&apos;s Portfolio Home
    </Link>
  );
};

export default PortfolioLink;
