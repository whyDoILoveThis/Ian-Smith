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
import ITSLoader from "./ItsLoader";
import AgeTag from "../sub/AgeTag";
import { appwrGetHeader } from "@/appwrite/appwrGetHeader";

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
  // ensure loader plays for at least 7 seconds
  const [loading, setLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    const getHeader = async () => {
      setHeaderObj(await appwrGetHeader());
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

  // start the minimum display timer on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const t = setTimeout(() => setMinTimeElapsed(true), 3000);
    // Fallback: enable scroll after 7 seconds even if image hasn't loaded
    const fallbackT = setTimeout(() => {
      document.body.style.overflow = "auto";
    }, 7000);

    return () => {
      clearTimeout(t);
      clearTimeout(fallbackT);
    };
  }, []);

  // hide loader only after we have an image URL and the minimum time elapsed
  useEffect(() => {
    if (imageUrl && minTimeElapsed) {
      setLoading(false);
      document.body.style.overflow = "auto";
    }
  }, [imageUrl, minTimeElapsed]);

  console.log("cmsheader", header);

  if (loading)
    return (
      <div className="fixed inset-0 bg-background zz-top-plus2 flex items-center justify-center">
        <ITSLoader />
      </div>
    );

  return (
    <article className="col-flex items-center max-w-[600px] sm:flex sm:justify-center md:flex-row md:items-center md:gap-2">
      {imageUrl && (
        <div className="flex items-center gap-1 bg-white dark:bg-opacity-10 bg-opacity-50 p-2 pb-8 m-2 rounded-3xl">
          <div className="relative bg-white dark:bg-opacity-5 bg-opacity-20 translate-y-4 w-[115px] h-[115px] flex items-center justify-center rounded-full">
            <Image
              onLoadingComplete={() => {
                setImgLoading(false);
              }}
              className={`${
                imgLoading && "opacity-50"
              } rounded-xl -translate-y-2 translate-x-1`}
              width={80}
              height={100}
              src={imageUrl}
              alt="adsfa"
            />
            {imgLoading && (
              <span className="absolute inset-0">
                <LoaderSpinSmall />
              </span>
            )}
          </div>
          <div className="translate-y-9 flex flex-col gap-2">
            <span className="flex flex-col ">
              <h1 className="text-3xl mt-0.5 text-center font-bold text-nowrap">
                {header}
              </h1>
              <AgeTag />
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
      <div className="text-center md:text-left mt-4">
        <h2 className="text-2xl md:text-3xl flex flex-wrap justify-center items-center font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          <div className="relative inline-block">
            <span className="bg-gradient-to-r mr-2 from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Full-Stack
            </span>{" "}
            <br />
          </div>
          React Developer
        </h2>
        <p className="mx-2 mt-3 text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          {tagline}
        </p>
      </div>
    </article>
  );
};

export default Header;
