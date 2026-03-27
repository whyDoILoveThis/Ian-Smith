"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Routes where scroll buttons should be visible
const VISIBLE_ROUTES = ["/", "/iconcreator"];

export default function ScrollJumpButtons() {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);
  const isVisible = VISIBLE_ROUTES.includes(pathname);

  useEffect(() => {
    const check = () => {
      const scrollY = window.scrollY;
      const windowH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      setShowTop(scrollY > 300);
      setShowBottom(scrollY + windowH < docH - 300);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 zz-top flex flex-row gap-1.5">
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-7 h-7 rounded-full border border-slate-200/40 dark:border-slate-700/30 bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
          aria-label="Scroll to top"
        >
          <span className="block w-1.5 h-1.5 border-l-[1.5px] border-t-[1.5px] border-slate-500 dark:border-slate-400 rotate-45 translate-y-[1px]" />
        </button>
      )}
      {showBottom && (
        <button
          onClick={() =>
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: "smooth",
            })
          }
          className="w-7 h-7 rounded-full border border-slate-200/40 dark:border-slate-700/30 bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
          aria-label="Scroll to bottom"
        >
          <span className="block w-1.5 h-1.5 border-r-[1.5px] border-b-[1.5px] border-slate-500 dark:border-slate-400 rotate-45 -translate-y-[1px]" />
        </button>
      )}
    </div>
  );
}
