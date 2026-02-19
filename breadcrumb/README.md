# Breadcrumb — Behavioral Intelligence Layer

A self-contained, privacy-safe behavioral observation system for the portfolio site. It passively infers abstract user states from first-party signals and packages them for LLM consumption.

## Architecture

```
breadcrumb/
├── index.ts                         # Public API barrel export
├── BreadcrumbProvider.tsx           # Root mount component (client-side)
├── types.ts                         # All type definitions + default config
├── store/
│   ├── sessionStore.ts              # In-memory + localStorage session state
│   └── returnVisitor.ts             # Return visit detection (localStorage)
├── collectors/
│   ├── deviceCollector.ts           # Device, viewport, timezone, referrer
│   ├── navigationCollector.ts       # Page visits, dwell time (History API)
│   ├── scrollCollector.ts           # Scroll depth + velocity sampling
│   └── interactionCollector.ts      # Hover hesitation + click intent
├── inference/
│   ├── inferenceEngine.ts           # Probabilistic state inference (7 heuristics)
│   └── narrativeBuilder.ts          # Natural-language session summary
└── ai/
    ├── contextAggregator.ts         # Builds LLM-ready JSON context
    └── promptTemplate.ts            # System + user prompt templates
```

## How It Mounts

**One import, one component** in `app/layout.tsx`:

```tsx
import { BreadcrumbProvider } from "@/breadcrumb";

// Inside the layout JSX, wrapping the existing content:
<BreadcrumbProvider>{/* existing layout content */}</BreadcrumbProvider>;
```

The provider renders nothing visible. It starts collectors on mount and tears them down on unmount.

## How to Remove

1. Delete the `breadcrumb/` folder
2. Remove the import and `<BreadcrumbProvider>` tags from `app/layout.tsx`

No other files are touched. No dependencies to uninstall.

## Behavioral Signals Captured

| Signal                      | Source                       | Privacy                       |
| --------------------------- | ---------------------------- | ----------------------------- |
| Page/view sequence          | History API                  | First-party only              |
| Time spent per page         | Timestamp diff               | No PII                        |
| Scroll depth (0–100%)       | Scroll position / doc height | No PII                        |
| Scroll velocity (px/s)      | Sampled scroll position      | No PII                        |
| Hover hesitation            | mouseenter/mouseleave timing | Element tag + class only      |
| Click intent vs abandonment | Click + navigation timing    | Element tag + class only      |
| Return visits               | localStorage counter         | No cookies, no fingerprinting |
| Device type                 | Viewport width breakpoints   | No user agent parsing         |
| Viewport dimensions         | window.innerWidth/Height     | Standard                      |
| Time-of-day / timezone      | Intl API + Date              | No geolocation                |
| Entry source                | document.referrer            | Only hostname extracted       |

## Inferred State Signals

The engine infers **abstract orientations**, never emotional labels:

- `exploratory-browsing` — visiting many different pages
- `deep-focus` — long dwell on few pages
- `seeking-clarity` — deep scroll, slow velocity
- `scanning-evaluating` — shallow scroll, fast velocity
- `confirming-expectations` — deep but fast scroll
- `weighing-options` — many hovers without clicks
- `careful-decisive` — hover-then-click patterns
- `high-urgency` — many pages per minute
- `reflective-pace` — slow navigation tempo
- `reconsidering` — recent return visit
- `ongoing-interest` — frequent but spaced visits
- `late-night-contemplation` — 11pm–4am browsing
- `personal-time-browsing` — weekend visit
- `professional-evaluation` — LinkedIn referrer
- `technical-evaluation` — GitHub referrer
- `search-driven-discovery` — search engine referrer
- `intentional-visit` — direct navigation, first visit

Each signal carries a `weight` (0–1) and `evidence[]` array explaining why it was inferred.

## Using the LLM Context

### From any client component:

```tsx
import { useBreadcrumb } from "@/breadcrumb";

function MyComponent() {
  const { getContext } = useBreadcrumb();

  const handleGenerate = async () => {
    const ctx = getContext();
    if (!ctx) return;

    // Send to your API route
    const res = await fetch("/api/generate-microcopy", {
      method: "POST",
      body: JSON.stringify(ctx),
    });
  };
}
```

### From an API route:

```ts
import { buildPrompt } from "@/breadcrumb";
import type { LLMContext } from "@/breadcrumb";

export async function POST(req: Request) {
  const ctx: LLMContext = await req.json();
  const { system, user } = buildPrompt(ctx);

  // Feed to any LLM API
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 50,
    temperature: 0.8,
  });

  return Response.json({ text: response.choices[0].message.content });
}
```

### Development Console Access

In development mode, access the full system via browser console:

```js
window.__breadcrumb.getContext(); // LLM-ready context object
window.__breadcrumb.getSession(); // Raw session data
```

## Configuration

Pass config overrides to the provider:

```tsx
<BreadcrumbProvider config={{
  enabled: true,                    // Master switch
  minDwellMs: 800,                  // Min dwell to record a page visit
  hoverThresholdMs: 600,            // Min hover time to count as hesitation
  scrollSampleIntervalMs: 250,      // Scroll sampling frequency
  maxPageHistory: 100,              // Max page visits per session
  maxHoverHistory: 50,              // Max hover events per session
}}>
```

## Disabling the System

### Option A: Config switch

```tsx
<BreadcrumbProvider config={{ enabled: false }}>
```

Nothing will initialize. Zero overhead.

### Option B: Environment variable

```tsx
<BreadcrumbProvider config={{ enabled: process.env.NEXT_PUBLIC_BREADCRUMB_ENABLED === "true" }}>
```

### Option C: Full removal

Delete `breadcrumb/` and remove the two lines from `layout.tsx`.

## Clearing User Data

```ts
import { clearVisitorData } from "@/breadcrumb";

// Clear all localStorage data the system has stored
clearVisitorData();
```

## Design Philosophy

- **No labels.** We infer orientations ("seeking clarity"), not diagnoses ("confused").
- **Evidence-based.** Every inference carries the raw signals that produced it.
- **Probabilistic.** Weights are 0–1 confidences, not binary flags.
- **Transparent.** All heuristics are visible in `inferenceEngine.ts`, well-commented.
- **Removable.** One folder, one import. Delete both and the site is unchanged.
- **Private.** No cookies, no fingerprinting, no external services, no PII collection.
