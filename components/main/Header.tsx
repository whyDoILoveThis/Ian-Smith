"use client";
import React, { useEffect, useState } from "react";
import image from "../../images/hero--img-wG-Vs64b.png";
import Image from "next/image";
import { fbGetHeader } from "@/firebase/fbGetHeader";
import Link from "next/link";
import FacebookIcon from "../sub/FacebookIcon";
import GithubIcon from "../sub/GithubIcon";
import Loader from "./Loader";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";

interface Props {
  cmsImageUrl?: string;
  cmsHeader?: string;
  cmsTagline?: string;
}

const Header = ({ cmsImageUrl, cmsHeader, cmsTagline }: Props) => {
  const [imageUrl, setImageUrl] = useState("");
  const [headerObj, setHeaderObj] = useState<Header | null>();
  const [header, setHeader] = useState("");
  const [tagline, setTagline] = useState("");

  useEffect(() => {
    const getHeader = async () => {
      setHeaderObj(await fbGetHeader());
    };

    if (!cmsImageUrl || !cmsHeader || !cmsTagline) {
      getHeader();
    }
  }, [cmsImageUrl, cmsHeader, cmsTagline]);

  useEffect(() => {
    if (headerObj && headerObj.imageUrl) {
      setImageUrl(headerObj.imageUrl);
      setHeader(headerObj.header);
      setTagline(headerObj.tagline);
    }
    if (cmsImageUrl || cmsHeader || cmsTagline) {
      cmsImageUrl && setImageUrl(cmsImageUrl);
      cmsHeader && setHeader(cmsHeader);
      cmsTagline && setTagline(cmsTagline);
    }
  }, [headerObj, cmsImageUrl, cmsHeader, cmsTagline]);

  console.log("cmsheader", header);

  if (!imageUrl)
    return (
      <div className="fixed inset-0 bg-background zz-top-plus2 flex items-center justify-center">
        <LoaderSpinSmall />
      </div>
    );

  return (
    <article className="col-flex items-center max-w-[600px] sm:flex sm:justify-center md:flex-row md:items-center md:gap-2">
      {imageUrl && (
        <div className="flex items-center gap-1 bg-white dark:bg-opacity-10 bg-opacity-50 p-2 pb-8 m-2 rounded-3xl">
          <div className="bg-white dark:bg-opacity-5 bg-opacity-20 translate-y-4 w-[115px] h-[115px] flex items-center justify-center rounded-full">
            <Image
              className="rounded-xl -translate-y-2 translate-x-1"
              width={80}
              height={100}
              src={imageUrl}
              alt="adsfa"
            />
          </div>
          <div className="translate-y-9 flex flex-col gap-2">
            <span className="flex flex-col ">
              <h1 className="text-3xl mt-0.5 text-center font-bold text-nowrap">
                {header}
              </h1>
              <p className="text-sm text-slate-400 self-end">26 years old</p>
            </span>
            <span className="flex items-center gap-1">
              <Link
                className="text-3xl btn btn-ghost btn-round"
                href={"https://facebook.com"}
              >
                <FacebookIcon />
              </Link>
              <Link
                className="text-[25px] btn btn-ghost btn-round"
                href={"https://facebook.com"}
              >
                <GithubIcon />
              </Link>
            </span>
          </div>
        </div>
      )}
      <div>
        <h2 className="text-center mt-2 text-xl font-bold">
          <span className="text-blue-400">Full-Stack</span> React Developer
        </h2>
        <p className="text-slate-700 dark:text-slate-200 mt-2">{tagline}</p>
      </div>
    </article>
  );
};

export default Header;
