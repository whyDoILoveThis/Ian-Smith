# ItsToastRenderer

A composable, animation-driven tagline and toast notification system built with **React**, **Framer Motion**, and **Tailwind CSS**. Display sequenced text messages, custom cards, or full toast notifications — anywhere in your app, with zero clashing.

---

## Table of Contents

- [Architecture](#architecture)
- [Installation](#installation)
- [Components](#components)
  - [ItsTagline](#itstagline)
  - [ItsTaglineGroup](#itstaglinegroup)
  - [ItsTaglineRenderer](#itstaglinerenderer)
  - [ItsToastRenderer](#itstoastrenderer)
- [Lifecycle & Timing](#lifecycle--timing)
- [Recipes](#recipes)
  - [Simple sequenced taglines](#simple-sequenced-taglines)
  - [Grouped taglines](#grouped-taglines)
  - [Custom card content](#custom-card-content)
  - [Looping taglines](#looping-taglines)
  - [Fixed-position toast](#fixed-position-toast)
  - [Slide-from-side toast](#slide-from-side-toast)
  - [Toast with taglines inside](#toast-with-taglines-inside)
  - [Custom positioning](#custom-positioning)
  - [Pause on hover](#pause-on-hover)
- [Real-World Usage — PortfolioLink](#real-world-usage--portfoliolink)
- [Animation Details](#animation-details)
- [File Structure](#file-structure)
- [Dependencies](#dependencies)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ItsToastRenderer  (optional)                               │
│  Fixed / slide-from-side toast wrapper                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ItsTaglineRenderer                                   │  │
│  │  Sequential orchestrator  ·  absolute inset-0         │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌────────────────────────────────┐  │  │
│  │  │ ItsTagline  │  │ ItsTaglineGroup                │  │  │
│  │  │             │  │                                │  │  │
│  │  │ Text or     │  │  ┌───────────┐ ┌───────────┐  │  │  │
│  │  │ Component   │  │  │ItsTagline │ │ItsTagline │  │  │  │
│  │  │             │  │  │  (child)  │ │  (child)  │  │  │  │
│  │  └─────────────┘  │  └───────────┘ └───────────┘  │  │  │
│  │                    └────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** Only **one** ItsTagline is ever visible at any given time. Components manage their own timers and communicate completion upward through internal callbacks — consumers never see any of this plumbing.

---

## Installation

All components live inside the `ItsToastRenderer/` directory and are exported from a single barrel:

```tsx
import {
  ItsTagline,
  ItsTaglineGroup,
  ItsTaglineRenderer,
  ItsToastRenderer,
} from "@/components/ItsToastRenderer";
```

### Peer dependencies

| Package          | Min version | Purpose                |
| ---------------- | ----------- | ---------------------- |
| `react`          | 18+         | Core                   |
| `framer-motion`  | 12+         | Enter / exit animation |
| `tailwindcss`    | 3+          | Utility styling        |
| `clsx`           | 2+          | className merging      |
| `tailwind-merge` | 2+          | Tailwind deduplication |

---

## Components

### ItsTagline

The **atomic unit**. Renders a styled line of text — or any arbitrary React component — with a smooth fade + slide + scale entrance and exit animation.

```tsx
<ItsTagline
  text="Hello world!"
  textColor="#ffffff"
  bgColor="#1e293b"
  duration={3000}
  className="text-lg font-semibold"
/>
```

#### Props

| Prop                 | Type        | Default | Description                                                                                                                               |
| -------------------- | ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `text`               | `string`    | —       | Text to display. **Ignored** when `children` are provided.                                                                                |
| `textColor`          | `string`    | —       | CSS color applied to the text (e.g. `"#fff"`, `"rgb(100,200,255)"`).                                                                      |
| `bgColor`            | `string`    | —       | CSS background color. When set, the tagline also applies `rounded-lg px-4 py-2` for a card look.                                          |
| `className`          | `string`    | —       | Additional Tailwind / CSS classes merged onto the root element.                                                                           |
| `children`           | `ReactNode` | —       | Custom component or card to render **instead** of plain text. Takes priority over `text`.                                                 |
| `duration`           | `number`    | `3000`  | How long (ms) the tagline stays visible. Only used when this tagline is a **direct child of ItsTaglineRenderer**. Ignored inside a Group. |
| `dontCloseIfHovered` | `boolean`   | `false` | When `true`, pauses the visibility timer while the user hovers. Resumes with the remaining time on mouse-leave.                           |

#### Rendering modes

**Text mode** — provide `text` (with optional `textColor` + `bgColor`):

```tsx
<ItsTagline text="Welcome!" textColor="white" bgColor="black" />
```

**Component mode** — pass any JSX as children:

```tsx
<ItsTagline>
  <div className="bg-white rounded-xl shadow-md p-6">
    <h3>Custom Card</h3>
    <p>Any content works here.</p>
  </div>
</ItsTagline>
```

---

### ItsTaglineGroup

Groups multiple ItsTaglines and renders them **one at a time**, in order. You control exactly how long each tagline stays visible.

```tsx
<ItsTaglineGroup intervals={[2500, 3000, 2000]}>
  <ItsTagline text="Step 1: Read" />
  <ItsTagline text="Step 2: Build" />
  <ItsTagline text="Step 3: Ship" />
</ItsTaglineGroup>
```

#### Props

| Prop                 | Type        | Default | Description                                                                                                                                |
| -------------------- | ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `children`           | `ReactNode` | —       | One or more `ItsTagline` components.                                                                                                       |
| `intervals`          | `number[]`  | —       | Display duration (ms) for each child. `intervals[0]` → first tagline, etc.                                                                 |
| `className`          | `string`    | —       | Additional Tailwind / CSS classes.                                                                                                         |
| `dontCloseIfHovered` | `boolean`   | `false` | When `true`, pauses the current tagline's interval timer while the user hovers over the group. Resumes with remaining time on mouse-leave. |

> **Note:** When inside a Group, each tagline's own `duration` prop is **ignored** — the Group's `intervals` array takes full control.

#### How it works

```
intervals = [2500, 3000, 2000]

Time  0ms ─── Show tagline 0 ────────── 2500ms ─── exit anim ─── Show tagline 1 ──...
```

1. Tagline `0` appears → stays visible for `intervals[0]` ms
2. Exit animation plays → tagline `1` enters
3. Stays for `intervals[1]` ms → exit → tagline `2` enters
4. After the last tagline exits → signals completion upstream

---

### ItsTaglineRenderer

The **master orchestrator**. Manages one or more children (each an `ItsTagline` or `ItsTaglineGroup`) and ensures only one is ever visible at a time. It fills its parent container by default via `absolute inset-0`.

```tsx
<div className="relative h-16 overflow-hidden">
  <ItsTaglineRenderer intervals={[1000, 2000, 500]}>
    <ItsTagline text="First" duration={3000} />
    <ItsTagline text="Second" duration={2500} />
    <ItsTagline text="Third" duration={4000} />
  </ItsTaglineRenderer>
</div>
```

#### Props

| Prop             | Type               | Default | Description                                                                                                                                                                      |
| ---------------- | ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`       | `ReactNode`        | —       | `ItsTagline` and/or `ItsTaglineGroup` components.                                                                                                                                |
| `intervals`      | `number[]`         | —       | **Delay** (ms) **before** each child appears. `intervals[0]` = delay before child 0.                                                                                             |
| `className`      | `string`           | —       | Override the default `absolute inset-0` positioning with any class.                                                                                                              |
| `loop`           | `boolean`          | `false` | Restart from the first child after the last one finishes.                                                                                                                        |
| `randomizeOrder` | `boolean`          | `false` | Shuffle child order on each loop iteration (after the first pass). Requires `loop={true}`.                                                                                       |
| `triggers`       | `(boolean \| 0)[]` | —       | Per-child trigger overrides. `true` = show immediately, `false` = wait until it becomes `true`, `0` = ignore trigger and use `intervals[i]`. Falls back to intervals if omitted. |
| `onComplete`     | `() => void`       | —       | Fires once all children have been displayed. Ignored when `loop` is `true`.                                                                                                      |

#### The `triggers` prop

`triggers` lets you gate individual children on reactive boolean state instead of (or in addition to) timed intervals:

```tsx
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [showPromo, setShowPromo] = useState(false);

<ItsTaglineRenderer
  intervals={[1000, 1000, 2000]}
  triggers={[isLoggedIn, 0, showPromo]}
>
  <ItsTagline text="Welcome back!" duration={3000} />{" "}
  {/* waits for isLoggedIn */}
  <ItsTagline text="Browse our catalog" duration={3000} />{" "}
  {/* uses 1000ms interval */}
  <ItsTagline text="🎁 Special offer!" duration={4000} />{" "}
  {/* waits for showPromo */}
</ItsTaglineRenderer>;
```

| Value   | Behavior                                                         |
| ------- | ---------------------------------------------------------------- |
| `true`  | Child shows immediately (trigger satisfied)                      |
| `false` | Child waits — re-evaluates each time the value changes to `true` |
| `0`     | Trigger ignored — falls back to `intervals[i]` timeout as normal |

#### The `intervals` difference

This is the most important distinction to understand:

| Component              | What `intervals[i]` means                      |
| ---------------------- | ---------------------------------------------- |
| **ItsTaglineRenderer** | Delay (ms) **before** child `i` appears        |
| **ItsTaglineGroup**    | Duration (ms) that child `i` **stays visible** |

---

### ItsToastRenderer

An **optional wrapper** that turns its children into a dismissible toast notification. Two distinct visual modes — and its position is fully customisable.

```tsx
<ItsToastRenderer
  delayBeforeShown={2000}
  delayBeforeGone={8000}
  closeWhenClicked
  slideFromSide
  className="top-8 right-0"
>
  <div className="w-72 p-4 bg-white rounded-xl shadow-lg">
    <p>Hey there!</p>
  </div>
</ItsToastRenderer>
```

#### Props

| Prop               | Type        | Default     | Description                                                                    |
| ------------------ | ----------- | ----------- | ------------------------------------------------------------------------------ |
| `children`         | `ReactNode` | —           | Content of the toast — can be anything (including an ItsTaglineRenderer).      |
| `delayBeforeShown` | `number`    | `0`         | Delay (ms) before the toast first appears.                                     |
| `delayBeforeGone`  | `number`    | `0` (never) | Time (ms) the toast stays visible before auto-dismissing. `0` = stays forever. |
| `className`        | `string`    | —           | Tailwind utilities to override default positioning (e.g. `top-4 left-4`).      |
| `closeWhenClicked` | `boolean`   | `false`     | Clicking the toast dismisses (or minimises) it.                                |
| `slideFromSide`    | `boolean`   | `false`     | Enables the slide-from-right mode with peek-to-reopen behavior.                |

#### Mode: Default (`slideFromSide={false}`)

- Appears at `fixed bottom-4 right-4` (override with `className`)
- Pops in with a fade + scale + slide-up animation
- When dismissed it fully disappears

#### Mode: Slide from side (`slideFromSide={true}`)

- Slides in from the right edge, vertically centered
- When closed, it **doesn't vanish** — it slides almost all the way out, leaving a **32px peek strip** visible
- Clicking the peek strip **reopens** the toast
- Default position is `fixed top-1/2 right-0 -translate-y-1/2` (override with `className`)

#### Toast state machine

```
                  delayBeforeShown
    ┌──────────┐ ─────────────────→ ┌──────────┐
    │  hidden  │                    │ visible  │
    └──────────┘ ←───────────────── └──────────┘
                  click / autoHide       │
                  (default mode)         │ click / autoHide
                                         │ (slide mode)
                                         ▼
                                    ┌───────────┐
                                    │ minimized │ ←─── 32px peek
                                    └───────────┘
                                         │
                                         │ click peek
                                         ▼
                                    ┌──────────┐
                                    │ visible  │
                                    └──────────┘
```

---

## Lifecycle & Timing

Understanding the full timing chain is key to composing these components. Here's the complete lifecycle when using all four together:

```
Time ──────────────────────────────────────────────────────────────────→

ItsToastRenderer
│
├─ [delayBeforeShown] ─── toast visible ─── [delayBeforeGone] ─── toast hidden/minimized
│
│  ItsTaglineRenderer (inside the toast)
│  │
│  ├─ [intervals[0]] ─── child 0 plays ─── exit ─── [intervals[1]] ─── child 1 plays ─── exit
│  │
│  │  Each "child plays" is either:
│  │
│  │  ▸ A solo ItsTagline
│  │    └─ visible for its `duration` ms → fires completion → exit anim
│  │
│  │  ▸ An ItsTaglineGroup
│  │    └─ tagline A (intervals[0] ms) → exit → tagline B (intervals[1] ms) → exit → ... → fires completion
```

### Timing example

```tsx
<ItsTaglineRenderer intervals={[1000, 500]}>
  <ItsTagline text="First" duration={2000} />
  <ItsTaglineGroup intervals={[1500, 1500]}>
    <ItsTagline text="Group A" />
    <ItsTagline text="Group B" />
  </ItsTaglineGroup>
</ItsTaglineRenderer>
```

| Time       | Event                                   |
| ---------- | --------------------------------------- |
| `0 ms`     | Renderer mounts, starts 1000ms delay    |
| `1000 ms`  | "First" fades in                        |
| `3000 ms`  | "First" duration ends, exit anim starts |
| `~3450 ms` | Exit complete, 500ms delay starts       |
| `~3950 ms` | Group mounts, "Group A" fades in        |
| `~5450 ms` | "Group A" exits, "Group B" fades in     |
| `~6950 ms` | "Group B" exits, group signals done     |
| `~7100 ms` | Renderer fires `onComplete`             |

---

## Recipes

### Simple sequenced taglines

Two messages, 2 seconds apart, each visible for 3 seconds:

```tsx
<div className="relative h-12">
  <ItsTaglineRenderer intervals={[0, 2000]}>
    <ItsTagline text="Welcome to my app" duration={3000} />
    <ItsTagline text="Let me show you around" duration={3000} />
  </ItsTaglineRenderer>
</div>
```

### Grouped taglines

A "chapter" of related messages that play back-to-back:

```tsx
<div className="relative h-12">
  <ItsTaglineRenderer intervals={[500]}>
    <ItsTaglineGroup intervals={[2000, 2000, 3000]}>
      <ItsTagline text="Step 1: Sign up" />
      <ItsTagline text="Step 2: Create a project" />
      <ItsTagline text="Step 3: Ship it 🚀" />
    </ItsTaglineGroup>
  </ItsTaglineRenderer>
</div>
```

### Custom card content

Use any component instead of text:

```tsx
<div className="relative h-32">
  <ItsTaglineRenderer intervals={[1000]}>
    <ItsTagline duration={5000}>
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-lg">🎉 New Feature</h3>
        <p className="text-sm opacity-90">Dark mode is now available!</p>
      </div>
    </ItsTagline>
  </ItsTaglineRenderer>
</div>
```

### Looping taglines

Cycle through messages forever:

```tsx
<div className="relative h-10">
  <ItsTaglineRenderer intervals={[0, 1000, 1000]} loop>
    <ItsTagline text="Fast" duration={2000} textColor="#10b981" />
    <ItsTagline text="Reliable" duration={2000} textColor="#3b82f6" />
    <ItsTagline text="Beautiful" duration={2000} textColor="#8b5cf6" />
  </ItsTaglineRenderer>
</div>
```

### Randomized looping taglines

Loop forever, but shuffle the order after the first pass so it feels fresh each cycle:

```tsx
<div className="relative h-10">
  <ItsTaglineRenderer intervals={[0, 800, 800, 800]} loop randomizeOrder>
    <ItsTagline text="🔥 Hot tip #1" duration={2500} />
    <ItsTagline text="💡 Hot tip #2" duration={2500} />
    <ItsTagline text="🚀 Hot tip #3" duration={2500} />
    <ItsTagline text="✨ Hot tip #4" duration={2500} />
  </ItsTaglineRenderer>
</div>
```

> The first cycle always plays in declaration order (1 → 2 → 3 → 4). Every subsequent cycle shuffles — e.g. 3 → 1 → 4 → 2. Each tagline keeps its own interval delay regardless of position.

### Fixed-position toast

A notification that pops up, stays for 10 seconds, then vanishes:

```tsx
<ItsToastRenderer
  delayBeforeShown={1000}
  delayBeforeGone={10000}
  closeWhenClicked
>
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 w-72">
    <p className="text-sm font-medium">📬 You have 3 new messages</p>
  </div>
</ItsToastRenderer>
```

### Slide-from-side toast

Slides in from the right; when dismissed, peeks 32px so the user can reopen it:

```tsx
<ItsToastRenderer
  slideFromSide
  delayBeforeShown={500}
  delayBeforeGone={8000}
  closeWhenClicked
>
  <div className="bg-white dark:bg-slate-800 rounded-l-lg shadow-xl p-4 w-80">
    <p className="font-semibold">Need help?</p>
    <p className="text-sm text-slate-500">Click here to chat with support.</p>
  </div>
</ItsToastRenderer>
```

### Toast with taglines inside

The ultimate combo — a slide-in toast that plays a sequence of taglines:

```tsx
<ItsToastRenderer slideFromSide delayBeforeShown={2000} closeWhenClicked>
  <div className="bg-white rounded-l-xl shadow-xl w-72 h-20 relative overflow-hidden">
    <ItsTaglineRenderer intervals={[0, 1500, 1500]} loop>
      <ItsTagline
        text="💡 Tip: Use keyboard shortcuts"
        duration={4000}
        className="text-sm p-4"
      />
      <ItsTagline
        text="⌨️ Ctrl+K to search"
        duration={4000}
        className="text-sm p-4"
      />
      <ItsTagline
        text="🎨 Try dark mode!"
        duration={4000}
        className="text-sm p-4"
      />
    </ItsTaglineRenderer>
  </div>
</ItsToastRenderer>
```

### Custom positioning

Override default positions with Tailwind utilities in `className`:

```tsx
{
  /* Top-left toast */
}
<ItsToastRenderer className="top-4 left-4 bottom-auto right-auto">
  <div className="bg-black text-white p-3 rounded-lg">Top left!</div>
</ItsToastRenderer>;

{
  /* Slide toast from the left instead of right */
}
<ItsToastRenderer slideFromSide className="left-0 right-auto">
  <div className="bg-white rounded-r-lg shadow-xl p-4 w-64">From the left!</div>
</ItsToastRenderer>;

{
  /* Centered tagline renderer (not absolute) */
}
<ItsTaglineRenderer
  intervals={[0]}
  className="relative flex items-center justify-center h-20"
>
  <ItsTagline text="Overridden layout" duration={5000} />
</ItsTaglineRenderer>;
```

### Pause on hover

Keep a tagline visible as long as the user hovers over it. The timer pauses while hovered and resumes with the remaining time when the cursor leaves:

```tsx
{
  /* On a standalone tagline */
}
<div className="relative h-12">
  <ItsTaglineRenderer intervals={[0, 1000]} loop>
    <ItsTagline
      text="Hover me — I won't disappear!"
      duration={4000}
      dontCloseIfHovered
    />
    <ItsTagline
      text="You can hover me too"
      duration={4000}
      dontCloseIfHovered
    />
  </ItsTaglineRenderer>
</div>;

{
  /* On a group — pauses whichever tagline is currently visible */
}
<div className="relative h-12">
  <ItsTaglineRenderer intervals={[500]}>
    <ItsTaglineGroup intervals={[3000, 3000, 3000]} dontCloseIfHovered>
      <ItsTagline text="Step 1" />
      <ItsTagline text="Step 2" />
      <ItsTagline text="Step 3" />
    </ItsTaglineGroup>
  </ItsTaglineRenderer>
</div>;
```

> When `dontCloseIfHovered` is set on an **ItsTaglineGroup**, the hover applies to the entire group wrapper — whichever child tagline is currently visible will have its timer paused. Individual taglines inside the group don't need their own `dontCloseIfHovered`.

---

## Real-World Usage — PortfolioLink

The first integration — the KwikMaps `PortfolioLink` component shows rotating taglines over the navigation link:

```tsx
import { ItsTaglineRenderer, ItsTagline } from "@/components/ItsToastRenderer";

const PortfolioLink = () => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Link
      href="/"
      className="relative block w-full text-center text-xs py-1.5 overflow-hidden ..."
    >
      ← Ian's Portfolio Home
      <ItsTaglineRenderer
        intervals={[4000, 3000]}
        className="absolute inset-0 z-10"
      >
        <ItsTagline
          text="✨ Check out my other projects!"
          duration={3500}
          bgColor="rgba(241,245,249,0.95)"
          className="text-xs text-slate-600 dark:text-slate-300 dark:!bg-slate-800/95"
        />
        <ItsTagline
          text="← Back to Portfolio Home"
          duration={3000}
          bgColor="rgba(241,245,249,0.95)"
          className="text-xs text-slate-600 dark:text-slate-300 dark:!bg-slate-800/95"
        />
      </ItsTaglineRenderer>
    </Link>
  );
};
```

**What happens:**

1. Link renders normally for **4 seconds**
2. "✨ Check out my other projects!" fades in, stays **3.5s**, fades out
3. **3 second** gap
4. "← Back to Portfolio Home" fades in, stays **3s**, fades out
5. The renderer is done — original link text is visible again

---

## Animation Details

All animations use Framer Motion and are defined in `utils/animations.ts`. They can be imported and customised if needed.

### Tagline enter/exit

| Property  | Initial | Animate | Exit    |
| --------- | ------- | ------- | ------- |
| `opacity` | `0`     | `1`     | `0`     |
| `y`       | `14px`  | `0`     | `-14px` |
| `scale`   | `0.97`  | `1`     | `0.97`  |

- **Duration:** 450ms
- **Easing:** Custom cubic bezier `[0.25, 0.46, 0.45, 0.94]`

### Toast default (pop)

| Property  | Initial | Animate | Exit   |
| --------- | ------- | ------- | ------ |
| `opacity` | `0`     | `1`     | `0`    |
| `y`       | `20px`  | `0`     | `20px` |
| `scale`   | `0.95`  | `1`     | `0.95` |

- **Duration:** 350ms
- **Easing:** Same cubic bezier

### Toast slide

| Property | Initial | Animate | Minimized           | Exit   |
| -------- | ------- | ------- | ------------------- | ------ |
| `x`      | `100%`  | `0%`    | `calc(100% - 32px)` | `110%` |

- **Type:** Spring (`damping: 28`, `stiffness: 320`)

---

## File Structure

```
components/ItsToastRenderer/
├── index.ts                          ← Barrel exports
├── ITS_TOAST_RENDERER.md             ← This file
│
├── components/
│   ├── ItsTagline.tsx                ← Atomic tagline (text or component)
│   ├── ItsTaglineGroup.tsx           ← Groups taglines, one-at-a-time
│   ├── ItsTaglineRenderer.tsx        ← Master orchestrator
│   └── ItsToastRenderer.tsx          ← Optional toast wrapper
│
├── types/
│   └── index.ts                      ← All TypeScript interfaces
│
├── utils/
│   └── animations.ts                 ← Framer Motion variants & transitions
│
├── hooks/                            ← Reserved for future hooks
└── lib/                              ← Reserved for future utilities
```

---

## Dependencies

| File                     | Imports from                   |
| ------------------------ | ------------------------------ |
| `ItsTagline.tsx`         | `framer-motion`, `@/lib/utils` |
| `ItsTaglineGroup.tsx`    | `framer-motion`, `@/lib/utils` |
| `ItsTaglineRenderer.tsx` | `framer-motion`, `@/lib/utils` |
| `ItsToastRenderer.tsx`   | `framer-motion`, `@/lib/utils` |

All components are marked `"use client"` and are fully compatible with Next.js App Router, React Server Components layouts, and any standard React 18+ application.
