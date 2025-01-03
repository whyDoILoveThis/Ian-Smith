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

const HeaderCMS = () => {
  const [image, setImage] = useState<File | null>(null); // State for file upload
  const [imageUrl, setImageUrl] = useState("");
  const [headerObj, setHeaderObj] = useState<Header | null>();
  const [header, setHeader] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
    setLoading(true);
    if (image) {
      try {
        // Upload image to Firebase Storage
        const tempImageUrl = await fbUploadImage(image);
        fbUpdateHeader({
          header,
          tagline,
          imageUrl: tempImageUrl,
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
      fbUpdateHeader({
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
      <h1>Header</h1>
      <Header cmsImageUrl={imageUrl} cmsHeader={header} cmsTagline={tagline} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="col-flex mx-4 gap-2 items-center rounded-2xl bg-black bg-opacity-10 p-6"
      >
        <div className="col-flex w-full items-center gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
          <label htmlFor="headerImg">Header Img</label>
          <div className="relative border-2 rounded-xl border-dashed p-2 px-4">
            <input
              id="headerImg"
              className="w-full h-full opacity-0 absolute"
              onChange={handleFileChange}
              type="file"
            />
            <UploadIcon />
          </div>
        </div>
        <div className="col-flex items-center border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
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
        <div className="col-flex items-center border rounded-xl bg-black bg-opacity-20 p-4 px-6 mb-4">
          <label htmlFor="tagline">Tagline</label>
          <textarea
            onChange={(e) => {
              setTagline(e.target.value);
            }}
            id="tagline"
            className="input !rounded-2xl h-[200px]"
            value={tagline}
          />
        </div>
        <Button
          variant="green"
          size="sm"
          className="btn place-self-end"
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
        </Button>
      </form>
    </div>
  );
};

export default HeaderCMS;
