"use client";
import React, { useEffect, useState } from "react";
import image from "../../images/hero--img-wG-Vs64b.png";
import Image from "next/image";
import { fbGetHeader } from "@/firebase/fbGetHeader";

const Header = () => {
  const [imageUrl, setImageUrl] = useState("");
  const [headerObj, setHeaderObj] = useState<Header | null>();
  const [header, setHeader] = useState("");
  const [tagline, setTagline] = useState("");

  useEffect(() => {
    const getHeader = async () => {
      setHeaderObj(await fbGetHeader());
    };

    getHeader();
  }, []);

  useEffect(() => {
    if (headerObj && headerObj.imageUrl) {
      setImageUrl(headerObj.imageUrl);
      setHeader(headerObj.header);
      setTagline(headerObj.tagline);
    }
  }, [headerObj]);

  return (
    <article className="col-flex items-center sm:flex sm:justify-center md:flex-row md:items-center ">
      {imageUrl && (
        <Image width={250} height={250} src={imageUrl} alt="adsfa" />
      )}
      <div>
        <h1 className="text-3xl text-nowrap">{header}</h1>
        <p>{tagline}</p>
      </div>
    </article>
  );
};

export default Header;
