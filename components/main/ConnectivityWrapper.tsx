"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import offlineSvg from "@/images/offline.svg";

export default function ConnectivityWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStatus = () => setOnline(navigator.onLine);

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    updateStatus(); // set initial state

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!online) {
    return (
      <article className="text-center bg-red-500 text-slate-950 rounded-xl shadow-lg">
        <div className="relative w-full h-screen flex flex-col justify-center items-center ">
          <div className="p-6 pb-20">
            <p className="text-xl font-semibold">🚫 You are offline 🚫</p>
            <p className="font-semibold">
              Check network adapters, and make sure you&#39;re connected.
            </p>
          </div>
          <Image
            src={offlineSvg}
            alt="Offline illustration"
            className="w-full h-auto"
          />
        </div>
      </article>
    );
  }

  return <>{children}</>;
}
