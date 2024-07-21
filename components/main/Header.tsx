"use client";
import React, { useEffect, useState } from "react";
import image from "../../images/hero--img-wG-Vs64b.png";
import Image from "next/image";
import { fbGetHeader } from "@/firebase/fbGetHeader";

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

  return (
    <article className="col-flex items-center p-4 max-w-[600px] sm:flex sm:justify-center md:flex-row md:items-center ">
      {imageUrl && (
        <Image width={250} height={250} src={imageUrl} alt="adsfa" />
      )}
      <div>
        <h1 className="text-3xl text-center text-nowrap">{header}</h1>
        <p>{tagline}</p>
      </div>
    </article>
  );
};

export default Header;
