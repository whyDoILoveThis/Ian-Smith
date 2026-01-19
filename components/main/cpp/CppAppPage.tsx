"use client";
import Image, { StaticImageData } from "next/image";
import React from "react";
import type { ThemeStyles } from "./softwareThemes";

type SoftwarePageProps = {
  title: string;
  description: string;
  downloadLink?: string;
  features: string[];
  screenshot?: StaticImageData | string;
  fileSize?: string;
  picW?: number;
  picH?: number;
  theme: ThemeStyles;
  demo?: React.ReactNode;
};

export default function SoftwarePage({
  title,
  description,
  downloadLink,
  features,
  screenshot,
  fileSize,
  picW,
  picH,
  theme,
  demo,
}: SoftwarePageProps) {
  return (
    <section className={`w-full max-w-3xl p-6 ${theme.card} ${theme.border}`}>
      <h1 className={`${theme.title} border-b pb-2 mb-4 ${theme.border}`}>
        {title}
      </h1>

      <p className="text-lg mb-6">{description}</p>

      {screenshot && (
        <div className="mb-6 flex justify-center">
          <Image
            width={picW || 300}
            height={picH || 200}
            src={screenshot}
            alt={`${title} screenshot`}
            className={`max-w-full rounded-sm ${theme.border}`}
          />
        </div>
      )}

      {demo && <div className="mb-6">{demo}</div>}

      <div className="mb-6">
        <h2 className={`text-xl font-semibold mb-2 border-b ${theme.border}`}>
          Features
        </h2>
        <ul className="list-disc list-inside space-y-1">
          {features.map((feature, idx) => (
            <li key={idx}>{feature}</li>
          ))}
        </ul>
      </div>

      {downloadLink && (
        <div className="mt-8 p-4 text-center ${theme.border}">
          <a href={downloadLink} download className={`${theme.button}`}>
            Download {title}{" "}
            <span className="text-xs text-white/80">
              {fileSize && `(${fileSize})`}
            </span>
          </a>
        </div>
      )}
    </section>
  );
}
