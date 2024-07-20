"use client";
import { fbUpdateHeader } from "@/firebase/fbUpdateHeader";
import { fbUploadImage } from "@/firebase/fbUploadImage";
import { useState, useEffect } from "react";
import Image from "next/image";
import { fbGetHeader } from "@/firebase/fbGetHeader";

const CMS = () => {
  const [image, setImage] = useState<File | null>(null); // State for file upload
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      // Use FileReader to read and display the image
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (image) {
      try {
        // Upload image to Firebase Storage
        const tempImageUrl = await fbUploadImage(image);
        fbUpdateHeader({
          header,
          tagline,
          imageUrl: tempImageUrl,
        });
      } catch (err) {
        console.log(err);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl">Header</h2>
      <article className=" sm:flex sm:flex-col sm:items-center md:flex items-center ">
        {imageUrl && (
          <Image width={250} height={250} src={imageUrl} alt="adsfa" />
        )}
        <div>
          <h1 className="text-3xl text-nowrap">{header}</h1>
          <p>{tagline}</p>
        </div>
      </article>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="col-flex gap-2"
      >
        <div>
          <label htmlFor="headerImg">Header Img</label>
          <input
            id="headerImg"
            className="input w-[260px]"
            onChange={handleFileChange}
            type="file"
          />
        </div>
        <div>
          <label htmlFor="header">Header</label>
          <input
            onChange={(e) => {
              setHeader(e.target.value);
            }}
            id="header"
            className="input"
            type="text"
            value={header}
          />
        </div>
        <div>
          <label htmlFor="tagline">Tagline</label>
          <input
            onChange={(e) => {
              setTagline(e.target.value);
            }}
            id="tagline"
            className="input"
            type="text"
            value={tagline}
          />
        </div>
        <button className="btn place-self-end" type="submit">
          Update Header
        </button>
      </form>
    </div>
  );
};

export default CMS;
