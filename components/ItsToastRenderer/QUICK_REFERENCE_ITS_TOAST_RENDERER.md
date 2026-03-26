# 🎨🔥 ItsToastRenderer Dev Poster — All-in-One Reference ⚡

---

## 🟢 **ItsTagline** — Single Message

```
┌───────────────┐
│ Hello World!  │
└───────────────┘
⏱ Duration: 3s
🎨 Colors: textColor / bgColor
💎 Children: JSX override
```

**Props Quick:**

- `text: string` → display text
- `textColor?: string` → text color
- `bgColor?: string` → card bg color
- `duration?: number` → ms visible
- `children?: JSX` → overrides text

---

## 🟡 **ItsTaglineGroup** — Sequential Messages

```
Step 1 ──(2s)──► Step 2 ──(3s)──► Step 3 ──(2s)
```

**Notes:**

- Child `duration` ignored
- `intervals: number[]` → time visible per child

---

## 🔵 **ItsTaglineRenderer** — Orchestrator

```
[Child1] ─► interval[0]
[Child2] ─► interval[1]
[Child3] ─► interval[2]
```

**Props Quick:**

- `intervals: number[]` → delay before child shows
- `loop?: boolean` → repeat after last child
- `randomizeOrder?: boolean` → shuffle after first pass
- `triggers?: (boolean|0)[]` → gate children
- `onComplete?: () => void` → fires when done

✅ Only **1 visible at a time**
🎲 Supports **loop + shuffle**

---

## 🚀 **ItsToastRenderer** — Floating Wrapper

```
┌─────────────────────┐
│ Slide / Fixed       │
│ ┌───────────────┐   │
│ │ Renderer/Tag  │   │
│ └───────────────┘   │
└─────────────────────┘
```

**Props Quick:**

- `delayBeforeShown?: number` → ms before first appear
- `delayBeforeGone?: number` → auto-hide ms
- `closeWhenClicked?: boolean` → dismiss / peek
- `slideFromSide?: boolean` → slide-right peek mode
- `className?: string` → override position

**Modes:**

- **Default** → fade + scale + pop in/out
- **SlideFromSide** → peek 32px when minimized

---

## ⚡ **Flow Cheat**

```
[ToastRenderer?] ──► [Renderer] ──► [Group?] ──► [Tagline]
                                 │
                                 ▼
                              intervals
                                 │
                                 ▼
                             loop/random
```

**Intervals Key:**

- **Renderer** → delay **before showing child**
- **Group** → duration **child stays visible**

**Trigger Key:**

- `true` → show immediately
- `false` → wait until true
- `0` → ignore, use interval

---

💡 **Tips:**

- Nest anything for max flexibility: **Toast → Renderer → Group → Tagline**
- Combine loops + triggers for dynamic flows
- Customize styles with Tailwind classes

---

If you want, I can also **make a full visual diagram version** with **colors, arrows, emoji icons for timing, loops, and triggers** — basically a **1-page cheat sheet poster you can pin on your monitor**.

Do you want me to do that next?
