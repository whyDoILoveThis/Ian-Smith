"use client";

import React from "react";
import Link from "next/link";
import ITSLogo from "../sub/ItsLogo";

const CppFooter = () => {
  return (
    <footer
      className="w-full mt-20 px-6 py-6 border-t-2"
      style={{
        background: "#dbeeff",
        borderColor: "#4b6fb3",
        boxShadow: "inset 0 2px 0 #ffffff",
      }}
    >
      {/* TOP ROW */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto">
        {/* LEFT: LOGO + LABEL */}
        <div className="flex items-center gap-4">
          <div
            className="p-2"
            style={{
              background: "linear-gradient(#ffffff,#d9ecff)",
              border: "3px solid #999",
              boxShadow: "inset 2px 2px 0 #fff, inset -2px -2px 0 #777",
            }}
          >
            <ITSLogo />
          </div>

          <div>
            <div className="font-bold text-sm" style={{ color: "#0b3b79" }}>
              C++ SOFTWARE ZONE
            </div>
            <div className="text-xs" style={{ color: "#12345a" }}>
              Native tools • utilities • experiments
            </div>
          </div>
        </div>

        {/* CENTER: NAV */}
        <nav className="flex items-center gap-6 text-sm font-semibold">
          <Link
            href="/its-cpp"
            style={{ color: "#0b3b79" }}
            className="hover:underline"
          >
            Software
          </Link>

          <Link
            href="/its-cpp#downloads"
            style={{ color: "#0b3b79" }}
            className="hover:underline"
          >
            Downloads
          </Link>

          <Link
            href="/its-cpp#source"
            style={{ color: "#0b3b79" }}
            className="hover:underline"
          >
            Source Code
          </Link>

          <Link
            href="/"
            style={{ color: "#0b3b79" }}
            className="hover:underline"
          >
            Back to Site
          </Link>
        </nav>
      </div>

      {/* BOTTOM BAR */}
      <div
        className="mt-6 pt-3 text-center text-xs"
        style={{
          color: "#12345a",
          borderTop: "2px solid #ffffff",
        }}
      >
        © {new Date().getFullYear()} Ian Thai Smith • C++ Builds & Utilities
        <span className="ml-2">🖥️🧠⚙️</span>
      </div>
    </footer>
  );
};

export default CppFooter;
