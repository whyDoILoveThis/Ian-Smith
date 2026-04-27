"use client";
import Header from "@/components/main/Header";
import ItsBot from "@/components/main/AI/ItsBot";
import Nav from "@/components/main/Nav";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";
import ItsPopover from "@/components/sub/ItsPopover";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useMotionValue, useSpring, motion } from "framer-motion";
import BotBtn from "@/components/main/AI/BotBtn";
import ConfettiCelebration from "@/components/main/ConfettiCelebration";
import useRefreshOnReconnect from "@/hooks/useRefreshOnReconnect";
import Footer from "@/components/main/Footer";
import PurpleParticleToggle from "@/components/main/PurpleParticleToggle";
import BrainfTodo from "@/components/sub/BrainfTodo";
import NetworkSpeedMini from "@/components/main/NetworkSpeedMini";
import LivingLine from "@/components/sub/LivingLine";
import {
  WaterSortShowcaseCard,
  TimelineShowcaseCard,
  ItsQuizMeShowcaseCard,
  IconCreatorShowcaseCard,
  PerformanceOverlayShowcaseCard,
} from "@/components/main/ShowcaseInstances";
import MostRecentProjects from "@/components/main/showcase-visuals/MostRecentProjects";
import ClientShowcaseGrid from "@/components/main/ClientShowcaseGrid";
import type { ClientShowcaseCardDetails } from "@/components/main/ClientShowcaseCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [showBot, setShowBot] = useState(false);
  const [activeProjectsTab, setActiveProjectsTab] = useState<
    "recent" | "client" | "older"
  >("recent");
  const tabRefs = useRef<
    Record<"recent" | "client" | "older", HTMLButtonElement | null>
  >({
    recent: null,
    client: null,
    older: null,
  });
  const rawX = useMotionValue(0);
  const rawWidth = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 360, damping: 34, mass: 0.82 });
  const springWidth = useSpring(rawWidth, {
    stiffness: 340,
    damping: 34,
    mass: 0.82,
  });

  const clientProjects: ClientShowcaseCardDetails[] = [
    {
      title: "Quikround MVP",
      tagline: "Fast multiplayer guessing game web app",
      clientsRequest: `Upwork Job Post - Quikround MVP Web App Developer

Job Title
Full-Stack Web Developer Needed to Build MVP Web App (React / Next.js / Firebase or Supabase)
________________________________________
Job Description
I am looking for a full-stack web developer to build the MVP (minimum viable product) for a web-based team game called Quikround.
Quikround is a simple web app where a host creates a numerical question, shares a link with a group, and players submit guesses. When the timer ends, the system ranks all guesses by closest to the correct answer and shows a leaderboard.
This is an MVP build, so the focus is on simplicity, reliability, and speed, not complex design or enterprise features.
________________________________________
Core Features Required

Round Creation
- Host creates a round
- Enter question and correct numeric answer
- Option to generate AI question and answer via API
- Set timer (default 10 minutes)
- System generates a unique shareable link

Round Logic
- Round status: Waiting -> Active -> Finished
- Timer starts when the first player joins
- Unlimited players can join
- Each player submits one guess
- Prevent duplicate player names
- Store submission timestamp for tie-break ranking

During Round
- Players see countdown timer
- Show number of players joined
- Mobile friendly interface

Results
- When timer ends, results page auto-refreshes for all users
- Leaderboard ranked by closest to correct answer
- Tie breaker: earliest submission wins if guesses are identical
- Show correct answer
- Highlight furthest guess (loser)
- Buttons:
  - Start another round
  - Share results
  - Copy link to play

Link Behaviour
- Same round link should:
  - Allow joining if round active
  - Show waiting screen if round in progress
  - Show results if round finished

Homepage
Simple landing page including:
- Logo
- Tagline
- How it works
- Start a round button
- Contact email
- Mobile friendly

Basic Analytics (simple database storage)
Store:
- Number of rounds created
- Number of players per round
- AI vs manual questions
- Round timestamps
________________________________________

Technical Requirements

Developer can propose stack, but likely something like:
- React or Next.js frontend
- Firebase or Supabase backend/database
- Hosted on Vercel or Netlify
- AI API integration for question generation
- GitHub repository owned by my company
- Mobile responsive design

Important:
- Code must be stored in GitHub owned by us
- Hosting accounts owned by us
- Full source code and deployment access required
- Developer will sign NDA and IP agreement
________________________________________

Timeline
Expected timeline:
2-4 weeks
________________________________________
Budget
GBP 1,000 - GBP 2,000 fixed price
________________________________________
To Apply, Please Answer The Following Questions

1. How would you build the timer and auto-refresh results system?
2. What tech stack would you use for this project and why?
3. Have you built any similar web apps or SaaS tools before? Please provide links.
4. How would you structure the database for rounds and guesses?
5. How would you implement the AI question generation feature?
6. How long do you estimate this project would take?
7. Would you be able to help deploy the site live?
8. Are you comfortable working with GitHub where the repository is owned by us?
9. What timezone are you in and how often can you provide updates?
10. Please start your proposal with the word "Quikround" so I know you have read this description.

PLEASE INCLUDE EXAMPLES OF WEB APPS OR SAAS PRODUCTS YOUR HAVE BUILT,NOT JUST WEBSITES.`,
      url: "https://quickroundd.vercel.app",
      themeColor: "violet",
    },
    {
      title: "GreenPulse Fitness",
      tagline: "Train smarter, live healthier",
      clientsRequest:
        "We need a high-energy website where members can book classes, track progress, and feel motivated the moment they land on the page.",
      url: "https://vercel.com",
      themeColor: "green",
    },
    {
      title: "UpKeepp MVP",
      tagline: "Luxury custom-home decision platform",
      clientsRequest: `Summary
Description:

We are building a high-end SaaS platform used by builders, interior designers, architects, and homeowners to manage design decisions, budget impact, and project alignment during a custom home build.

This is NOT a generic app.
The focus is on:

- clean UX
- simplicity
- premium (luxury-level) experience

We are looking for an experienced Bubble developer to build a fast MVP (3-5 weeks).

Product Overview

Today, luxury home projects are managed across:

- emails
- PDFs
- text messages
- in-person meetings

This leads to:

- confusion
- delays
- budget surprises
- misalignment between team members

We are creating a platform where:

All client decisions live in one place-with clear visibility into selections, budget impact, and status.

Core Use Case

A designer presents 3-4 curated options (tile, flooring, fixtures, etc.)

The homeowner:

- reviews
- asks questions
- approves selections

The builder:

- sees decisions in real time
- understands budget impact
- tracks what's still pending

Scope (MVP)

We are intentionally keeping this focused and simple.

1. User Accounts
*Login / authentication
*Roles:
  - Builder
  - Designer
  - Client

2. Project Dashboard
  * Create project
  * Add team members
  * View all decision boards

3. Decision Boards (CORE FEATURE)

Example: "Primary Bathroom - Tile Selection"
Each board should allow:

- Add 3-4 options
- Each option includes:
  - image
  - title
  - description
  - designer notes
  - optional price impact (+ / -)

4. Client Interaction
* Commenting on options
* "Approve" or "Favorite" selections

5. Builder-Focused Features (Important)
This platform must also support basic builder needs without becoming full project management software.

Include:
Budget Awareness
- Each option can show price impact (e.g. +$10,000)
- Clearly visible to all users

Decision Status Tracking
Each board should have:
- Pending
- Approved
- Needs Revision

Builder Dashboard View
Builder users should be able to see:

- All decision boards
- Status of each
- "Upcoming Decisions" (what needs approval soon)

Goal:
Provide builders with:
- visibility into decisions
- awareness of delays
- basic budget insight

We are NOT building a full system like Buildertrend

6. Clean, Premium UI

This is VERY important.
We are targeting a luxury audience:
- minimal
- elegant
- well-spaced
- intuitive

What We Care About Most
- Simplicity
- Speed
- Clean UX
- Logical workflow

NOT:
-complex features
-heavy integrations
-over-engineering

Tech Stack
- Bubble (preferred)

Open to:
-recommendations
-best practices for structure

Ideal Candidate

You should:
- Have built SaaS dashboards in Bubble
- Understand multi-user workflows
- Be able to translate business needs into simple UX
- Communicate clearly and proactively`,
      url: "https://upkeepp.vercel.app",
      themeColor: "blue",
    },
    {
      title: "Zign Two Ops MVP",
      tagline: "Sign installation operations and dispatch platform",
      clientsRequest: `We are a sign installation company looking to build a custom web-based operations system (not a marketing website). This will be used by office staff and installers to manage jobs, scheduling, and routing. The system must be built with a backend + database + API, so we can later develop a mobile app (iOS/Android) using the same backend.

MVP Features Needed
User login + roles (Admin/Office vs Installer/Field)
Job creation & job details (client, address, install date, notes, attachments)
Scheduling/dispatch calendar (assign jobs to installers, reschedule easily)
Job status tracking (Scheduled, In Progress, Completed, On Hold)
Map view + routing (job locations + open navigation via Google Maps)
Installer view (see assigned jobs, update status, add notes)
Photo/document upload (before/after photos, permits, drawings)

Preferred Tech Stack
Web: React / Next.js
Backend: Node.js (Express or NestJS)
Database: PostgreSQL
Maps: Google Maps API
Must be API-first for future React Native mobile app

Deliverables
Web app + admin dashboard
Backend/database setup
Source code + documentation
Deployment/hosting guidance

How We Work

Milestone-based (MVP first), weekly updates, clear communication`,
      url: "https://zign-two.vercel.app",
      themeColor: "orange",
    },
  ];

  useRefreshOnReconnect();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[activeProjectsTab];
      if (!activeEl) return;
      rawX.set(activeEl.offsetLeft);
      rawWidth.set(activeEl.offsetWidth);
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeProjectsTab]);

  return (
    <article className={`w-full col-flex items-center`}>
      {!showBot && <Nav />}
      <div className="w-full col-flex items-center mb-6">
        <Header />
      </div>
      <Skills />
      <div className="w-full mt-10 px-4">
        <ConfettiCelebration />
      </div>
      <SectionHeading title="Projects" />
      <section className="relative w-full max-w-6xl px-4">
        <div className="pointer-events-none absolute inset-x-14 top-8 h-28 bg-gradient-to-r from-fuchsia-500/10 via-violet-400/14 to-indigo-500/10 blur-3xl" />

        <Tabs
          value={activeProjectsTab}
          onValueChange={(value) =>
            setActiveProjectsTab(value as "recent" | "client" | "older")
          }
          className="relative w-full"
        >
          <TabsList
            className="
              relative isolate w-full h-auto p-1 gap-1 rounded-xl
              border border-white/20 bg-[linear-gradient(180deg,rgba(12,12,20,0.78),rgba(8,8,14,0.7))] backdrop-blur-xl
              shadow-[0_14px_28px_-20px_rgba(0,0,0,0.82),0_10px_22px_-18px_rgba(168,85,247,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]
              grid grid-cols-1 sm:grid-cols-3
            "
          >
            <div className="pointer-events-none absolute inset-[1px] rounded-[11px] border border-white/12" />
            <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-fuchsia-400/28 via-violet-400/32 to-indigo-400/28 opacity-55 blur-[1px] -z-10" />

            <motion.div
              style={{ x: springX, width: springWidth }}
              className="pointer-events-none absolute top-1 bottom-1 z-0 rounded-lg will-change-transform"
            >
              <motion.div
                key={activeProjectsTab}
                initial={{ scaleX: 0.9, scaleY: 1.14 }}
                animate={{
                  scaleX: [0.9, 1.16, 0.92, 1.05, 1],
                  scaleY: [1.14, 0.86, 1.1, 0.97, 1],
                }}
                transition={{ duration: 0.52, times: [0, 0.24, 0.5, 0.76, 1] }}
                className="absolute inset-0 rounded-lg border border-purple-500 bg-purple-600/20 shadow-[0_0_0_1px_rgba(168,85,247,0.32),0_10px_22px_-14px_rgba(168,85,247,0.62),inset_0_1px_0_rgba(255,255,255,0.14)]"
              />
            </motion.div>

            <TabsTrigger
              value="recent"
              ref={(el) => {
                tabRefs.current.recent = el;
              }}
              className="
                relative z-10 isolate overflow-hidden rounded-lg py-1.5 px-3 text-[12px] md:text-[13px] font-semibold tracking-wide
                text-white/75 data-[state=active]:text-white
                data-[state=active]:bg-transparent
                data-[state=active]:text-purple-200
                hover:text-white hover:bg-white/[0.05]
              "
            >
              Most Recent
            </TabsTrigger>
            <TabsTrigger
              value="client"
              ref={(el) => {
                tabRefs.current.client = el;
              }}
              className="
                relative z-10 isolate overflow-hidden rounded-lg py-1.5 px-3 text-[12px] md:text-[13px] font-semibold tracking-wide
                text-white/75 data-[state=active]:text-white
                data-[state=active]:bg-transparent
                data-[state=active]:text-purple-200
                hover:text-white hover:bg-white/[0.05]
              "
            >
              Client Showcase
            </TabsTrigger>
            <TabsTrigger
              value="older"
              ref={(el) => {
                tabRefs.current.older = el;
              }}
              className="
                relative z-10 isolate overflow-hidden rounded-lg py-1.5 px-3 text-[12px] md:text-[13px] font-semibold tracking-wide
                text-white/75 data-[state=active]:text-white
                data-[state=active]:bg-transparent
                data-[state=active]:text-purple-200
                hover:text-white hover:bg-white/[0.05]
              "
            >
              Older Projects
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="recent"
            className="mt-8 focus-visible:ring-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-[0.99] data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"
          >
            <MostRecentProjects />
          </TabsContent>

          <TabsContent
            value="client"
            className="mt-8 focus-visible:ring-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-[0.99] data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"
          >
            <ClientShowcaseGrid items={clientProjects} />
          </TabsContent>

          <TabsContent
            value="older"
            className="mt-8 focus-visible:ring-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-[0.99] data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"
          >
            <Projects />
          </TabsContent>
        </Tabs>
      </section>
      <div className="h-6" />
      {/* FIXED POSITIONS 👇*/}
      <BotBtn showBot={showBot} setShowBot={setShowBot} />
      {showBot && <ItsBot show={showBot} setShow={setShowBot} />}
      <NetworkSpeedMini />
      <Footer />
    </article>
  );
}

const SectionHeading = ({ title }: { title: string }) => {
  return (
    <>
      <h2 className="text-center text-4xl md:text-5xl font-extrabold mt-24 mb-4 tracking-tight bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
        {title}
      </h2>
      <LivingLine className="mb-12" />
    </>
  );
};
