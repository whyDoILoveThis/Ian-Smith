"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import ItsDropdown from "@/components/ui/its-dropdown";

export function ThemeToggler() {
  const { setTheme } = useTheme();

  return (
    <div className="zz-top-plus2">
      <ItsDropdown
        position="down-right"
        closeWhenItemClick
        className="max-w-fit !bg-opacity-40 backdrop-blur-md rounded-2xl border border-slate-200/10 dark:border-slate-800/50 shadow-xl"
        trigger={
          <Button
            className="relative focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 focus:outline-none w-9 h-9 rounded-full"
            variant="outline"
            size="sm"
          >
            <Sun className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        }
      >
        <button
          onClick={() => setTheme("light")}
          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Sun className="h-4 w-4" />
          Light
        </button>

        <button
          onClick={() => setTheme("dark")}
          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>

        <button
          onClick={() => setTheme("system")}
          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Monitor className="h-4 w-4" />
          System
        </button>
      </ItsDropdown>
    </div>
  );
}
