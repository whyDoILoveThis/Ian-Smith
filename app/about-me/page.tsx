/**********************************************************************
 * 🙏 NEXT.JS CLIENT BLESSING 🙏
 *
 * I, the humble developer, acknowledge the sacred rules of the App Router.
 * I offer this component to the Next.js Gods:
 *
 * "I shall not use state, hooks, or interactivity without Your blessing.
 * I shall honor server and client boundaries.
 * I shall always place 'use client' at the top of the file
 * if I dare to summon React state or effects."
 *
 * May my builds be swift and my hydration flawless. 🕊️
 **********************************************************************/
"use client"; // ✨ THE HOLY INCANTATION ✨

import Nav from "@/components/main/Nav";
import Link from "next/link";
import React from "react";

const AboutMe = () => {
  return (
    <article className="pt-6 pb-10">
      <Nav />
      <section
        aria-labelledby="about-heading"
        className="w-full flex justify-center py-12 px-4 bg-transparent"
      >
        <div
          className="max-w-4xl w-full rounded-2xl p-8 md:p-12 bg-white/90 dark:bg-gray-900/90
                   border border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-none
                   backdrop-blur-sm"
          role="region"
        >
          {/* BIG H1 — user requested H1 every time + emojis */}
          <header className="text-center mb-8">
            <h1
              id="about-heading"
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight
                       text-gray-900 dark:text-gray-50 leading-tight"
            >
              About Me 🚀🖥️
            </h1>
            <p className="mt-3 text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Full-Stack React developer — focused on clarity, performance, and
              shipping readable, maintainable code. I build things people
              actually use.
            </p>
          </header>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left column: avatar + badges + CTAs */}
            <aside className="md:w-1/3 flex flex-col items-center md:items-start gap-6">
              <div
                className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-100 to-slate-200
                         dark:from-gray-800 dark:to-gray-900 flex items-center justify-center
                         text-2xl font-bold text-slate-800 dark:text-slate-100 ring-1 ring-gray-200 dark:ring-gray-700"
                aria-hidden
              >
                ITS
              </div>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {/* Tech badges — keep concise, emoji-rich */}
                <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                  ⚛️ React
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                  🧠 TypeScript
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                  🔧 Next.js
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                  🗄️ Node / Express
                </span>
              </div>

              <div className="flex gap-3 mt-2">
                <a
                  href="/resume.pdf"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold
                           bg-slate-900 text-white rounded-md shadow-sm hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
                  aria-label="Download resume"
                >
                  📄 Resume
                </a>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold
                           border border-transparent rounded-md bg-white text-slate-900 dark:bg-transparent dark:text-slate-100
                           shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
                  aria-label="Contact me"
                >
                  ✉️ Contact
                </Link>
              </div>
            </aside>

            {/* Right column: content */}
            <div className="md:w-2/3 text-base md:text-lg leading-relaxed text-gray-700 dark:text-gray-300 space-y-6">
              <p>
                Hi — I’m <strong>Ian Thai Smith</strong>. I build web apps with
                a focus on clean UX, performance, and simple DX for other
                developers. I prefer small, maintainable codebases that scale,
                and I enjoy turning rough ideas into polished products.
              </p>

              <p>
                My toolkit includes React, Next.js, TypeScript, Node, and
                Tailwind. I’ve shipped utilities and small native tools (C++),
                as well as dashboards and full stack systems. I love optimizing
                critical paths and improving developer ergonomics.
              </p>

              <p>
                When I’m not coding, I’m outside training, reading, or tinkering
                with small projects. If you’re hiring or want to collaborate,
                reach out — I respond quickly.
              </p>

              {/* Optional quick facts / stats */}
              <dl className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">
                    Experience
                  </dt>
                  <dd className="text-base font-medium text-gray-900 dark:text-gray-100">
                    2+ years
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">
                    Focus
                  </dt>
                  <dd className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Web Apps & Tools
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Accessibility & prefers-reduced-motion safeguard */}
        <style jsx>{`
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-delay: 0 !important;
              animation-duration: 0 !important;
              transition-duration: 0 !important;
            }
          }
        `}</style>
      </section>
    </article>
  );
};

export default AboutMe;
