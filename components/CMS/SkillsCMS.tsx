"use client";
import React, { useState } from "react";
import Image from "next/image";
import {
  appwrFetchSkills,
  appwrSaveSkill,
  appwrDeleteSkill,
} from "@/appwrite/appwrSkillManager";
import { Button } from "../ui/button";
import UploadIcon from "../sub/UploadIcon";

const SkillsComponent: React.FC = () => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSkills = async () => {
    setSkills(await appwrFetchSkills());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleSubmit = async () => {
    if (file && text) {
      setLoading(true);
      await appwrSaveSkill({ file, text });
      fetchSkills();
      setText("");
      setImageUrl("");
      setFile(null);
      setLoading(false);
    } else if (!file) {
      alert("Please select an image file and try again.");
    } else if (!text) {
      alert("Please enter a skill name and try again.");
    }
    if (!text && !file) {
      alert("Bro it's empty!🤦‍♂️");
    }
  };

  const handleDelete = async (id: string, fileId?: string) => {
    await appwrDeleteSkill(id, fileId);
    fetchSkills();
  };

  React.useEffect(() => {
    fetchSkills();
  }, []);

  console.log(skills);

  return (
    <div className="mt-4 max-w-xl w-full mx-auto rounded-2xl p-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/20 dark:border-slate-800/40 shadow-xl">
      {/* Top — preview + hint */}
      <div className="flex items-center gap-4">
        {imageUrl ? (
          <Image
            width={56}
            height={56}
            src={imageUrl}
            alt={text || "skill preview"}
            className="w-14 h-14 rounded-xl object-cover ring-1 ring-slate-200/40"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-2xl">
            📷
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ✨ For best results, use a perfectly square image.
          </p>
          <p className="mt-1 font-semibold text-lg truncate max-w-[280px]">
            {text !== "" && text}
          </p>
        </div>
      </div>

      {/* Upload + input + action */}
      <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-[1fr_auto] items-center">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/20 dark:border-slate-700/30">
          <label
            htmlFor="headerImg"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add(
                "ring-2",
                "ring-emerald-400",
                "bg-emerald-100/30",
                "dark:bg-emerald-400/10",
              );
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove(
                "ring-2",
                "ring-emerald-400",
                "bg-emerald-100/30",
                "dark:bg-emerald-400/10",
              );
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove(
                "ring-2",
                "ring-emerald-400",
                "bg-emerald-100/30",
                "dark:bg-emerald-400/10",
              );

              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const fakeEvent = {
                  target: { files: e.dataTransfer.files },
                } as unknown as React.ChangeEvent<HTMLInputElement>;

                handleFileChange(fakeEvent);
              }
            }}
            className="relative flex-none w-14 h-14 rounded-lg overflow-hidden cursor-pointer flex items-center justify-center bg-white/60 dark:bg-slate-700/40 border border-slate-200/20 hover:scale-105 transition-transform"
            aria-hidden
          >
            <input
              id="headerImg"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
              type="file"
              accept="image/*"
            />
            <div className="flex flex-col items-center text-xs pointer-events-none">
              <UploadIcon />
              <span className="mt-1">Upload</span>
            </div>
          </label>

          <input
            className="w-full bg-transparent px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Skill name..."
            aria-label="Skill name"
          />
        </div>

        <button
          className="btn btn-green btn-sm btn-squish place-self-end mr-4"
          onClick={handleSubmit}
          aria-label="Add Skill"
        >
          +Add Skill
        </button>
      </div>

      {/* Skills list (chips) */}
      <ul className="mt-4 flex flex-wrap gap-3 p-3 rounded-2xl bg-gradient-to-tr from-white/40 to-slate-50/10 dark:from-slate-900/40 dark:to-slate-800/30 border border-slate-200/10">
        {skills.map((skill) => (
          <li
            className="flex items-center gap-3 rounded-full px-3 py-2 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/10 hover:scale-105 transition cursor-pointer"
            key={skill.$id}
          >
            <Image
              src={skill.url}
              alt={skill.text}
              width={28}
              height={28}
              className="w-7 h-7 overflow-visible object-cover"
            />
            <span className="font-medium text-sm">{skill.text}</span>
            <button
              className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-600/10 transition"
              onClick={() => handleDelete(skill.$id, skill.fileId)}
              aria-label={`Delete ${skill.text}`}
            >
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SkillsComponent;
