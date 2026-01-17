"use client";
import { fbUpdateHeader } from "@/firebase/fbUpdateHeader";
import { fbUploadImage } from "@/firebase/fbUploadImage";
import { useState, useEffect } from "react";
import { fbGetHeader } from "@/firebase/fbGetHeader";
import Header from "../main/Header";
import { ProgressBar } from "react-loader-spinner";
import { Button } from "../ui/button";
import { useToast } from "@/components/ui/use-toast";
import UploadIcon from "../sub/UploadIcon";
import { appwrImgUp } from "@/appwrite/appwrStorage";
import { appwrUpdateHeader } from "@/appwrite/appwrStorage";
import { appwrGetHeader } from "@/appwrite/appwrGetHeader";

const HeaderCMS = () => {
  const [image, setImage] = useState<File | null>(null); // State for file upload
  const [imageUrl, setImageUrl] = useState("");
  const [headerObj, setHeaderObj] = useState<Header | null>(null);
  const [header, setHeader] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getHeader = async () => {
      setHeaderObj(await appwrGetHeader());
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
    setLoading(true);
    if (image) {
      try {
        // Upload image to appwrite Storage
        const { url } = await appwrImgUp(image);
        appwrUpdateHeader({
          header,
          tagline,
          imageUrl: url,
        });
        toast({
          variant: "success",
          title: "Success!!🎉",
          description: "Your header section has been updated!😁",
        });
      } catch (err) {
        console.log(err);
      }
    } else if (imageUrl !== "") {
      appwrUpdateHeader({
        header,
        tagline,
        imageUrl,
      });
      toast({
        variant: "success",
        title: "Success!!🎉",
        description: "Your header section has been updated!😁",
      });
    }
    setLoading(false);
  };

  console.log("header", header);

  return (
    <div className="col-flex items-center py-4 rounded-2xl">
      <h2 className="italic text-green-300">NEW UPDATES!</h2>
      <Header cmsImageUrl={imageUrl} cmsHeader={header} cmsTagline={tagline} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="mt-4 max-w-xl w-full mx-auto rounded-2xl p-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/20 dark:border-slate-800/40 shadow-xl flex flex-col gap-4"
      >
        {/* Header Image */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/20 dark:border-slate-700/30">
          <label
            htmlFor="headerImg"
            className="relative flex-none w-16 h-16 rounded-xl overflow-hidden cursor-pointer flex flex-col items-center justify-center bg-white/60 dark:bg-slate-700/40 border border-slate-200/20 hover:scale-105 transition-transform"
          >
            <input
              id="headerImg"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
              type="file"
              accept="image/*"
            />
            <UploadIcon />
            <span className="text-xs text-center mt-1">Header Image</span>
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Square images work best for clean results.
          </p>
        </div>

        {/* Header Text */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/20 dark:border-slate-700/30">
          <label htmlFor="header" className="text-sm font-medium">
            Header
          </label>
          <input
            id="header"
            type="text"
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            className="w-full bg-transparent px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            placeholder="Main heading..."
          />
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/20 dark:border-slate-700/30">
          <label htmlFor="tagline" className="text-sm font-medium">
            Tagline
          </label>
          <textarea
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full bg-transparent px-4 py-3 rounded-2xl h-[180px] resize-none border border-transparent focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            placeholder="Short description or subtitle..."
          />
        </div>

        {/* Submit */}
        <button
          className="btn btn-green btn-sm btn-squish place-self-end mt-2"
          type="submit"
        >
          {loading ? (
            <ProgressBar
              height="27"
              width="80"
              borderColor="#82828274"
              barColor="#82828274"
              ariaLabel="progress-bar-loading"
            />
          ) : (
            "Update Header"
          )}
        </button>
      </form>
    </div>
  );
};

export default HeaderCMS;
