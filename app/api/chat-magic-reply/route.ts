import { NextResponse } from "next/server";

/**
 * POST /api/chat-magic-reply
 *
 * Body:
 *   recentMessages: { sender: string; text: string; isMe: boolean }[]
 *   myName:      string   – the current user's screen name
 *   mySlotId:    string   – "1" | "2"
 *   mode:        string   – one of the mode keys below
 *   length?:     "short" | "medium" | "long"  (default "medium")
 *   currentText?: string  – text already in the input field (for rewrite modes)
 */

// ── Length instructions appended to every system prompt ───────────────
const LENGTH_INSTRUCTIONS: Record<string, string> = {
  short:  "Keep the reply very short — a few words or one brief sentence at most.",
  medium: "Keep the reply a moderate length — 1-2 casual sentences.",
  long:   "Write a longer, more detailed reply — 3-5 sentences. Add depth and substance.",
};

// ── Mode → System-prompt mapping ─────────────────────────────────────

type PromptBuilder = (myName: string, lenInstr: string) => { role: string; content: string };

const MODE_PROMPTS: Record<string, { generate: PromptBuilder; rewrite: PromptBuilder }> = {
  // Default / plain
  generate: {
    generate: (n, len) => ({
      role: "system",
      content: `You are a helpful chat assistant. You are ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat with another person. Your job is to write a message FROM "${n}" TO the other person. CRITICAL: You are NOT the other person. You are writing what "${n}" should say next in response to what the OTHER person said most recently. Never generate a reply as if you are replying to "${n}" — you ARE "${n}". ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a helpful chat assistant. "${n}" has drafted a reply in a private chat. Reword it to be better and more natural while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-funny": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a witty chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write a funny, lighthearted message FROM "${n}" TO the other person. You ARE "${n}" — never reply as if you're the other person. Be humorous but not mean. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a witty chat assistant. "${n}" has drafted a reply. Reword it to be funnier and more lighthearted while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-flirty": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a charming chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write a subtly flirty and sweet message FROM "${n}" TO the other person. You ARE "${n}". Keep it tasteful and charming. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a charming chat assistant. "${n}" has drafted a reply. Reword it to be flirty and sweet while keeping the same meaning. Tasteful only. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-formal": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a professional chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write a polite, well-spoken message FROM "${n}" TO the other person. You ARE "${n}". Articulate but not stiff. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a professional chat assistant. "${n}" has drafted a reply. Reword it to be more polished and well-spoken while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-sarcastic": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a sarcastic chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write a playfully sarcastic message FROM "${n}" TO the other person. You ARE "${n}". Witty and dry but never hurtful. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a sarcastic chat assistant. "${n}" has drafted a reply. Reword it with a layer of playful sarcasm and dry wit while keeping the core meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-supportive": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a warm and encouraging chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write a supportive, uplifting message FROM "${n}" TO the other person. You ARE "${n}". Be genuine and caring. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a warm chat assistant. "${n}" has drafted a reply. Reword it to be more supportive, encouraging, and heartfelt while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-mysterious": {
    generate: (n, len) => ({
      role: "system",
      content: `You are an enigmatic chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write an intriguing, slightly mysterious message FROM "${n}" TO the other person. You ARE "${n}". Be cryptic but not confusing. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are an enigmatic chat assistant. "${n}" has drafted a reply. Reword it to be more mysterious and intriguing while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-bold": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a bold and confident chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write a daring, assertive message FROM "${n}" TO the other person. You ARE "${n}". Confident energy, not aggressive. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a bold chat assistant. "${n}" has drafted a reply. Reword it to be more confident and assertive while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-poetic": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a poetic chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write a beautifully-worded, poetic message FROM "${n}" TO the other person. You ARE "${n}". Use vivid language and imagery without being over-the-top. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a poetic chat assistant. "${n}" has drafted a reply. Reword it with more beautiful, vivid, poetic language while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-genz": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a gen-z chat assistant ghostwriting for "${n}". "${n}" is in a private 1-on-1 chat. Write a message FROM "${n}" TO the other person using current gen-z slang, tone, and internet culture. You ARE "${n}". Keep it natural and not forced. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a gen-z chat assistant. "${n}" has drafted a reply. Reword it to sound like natural gen-z speak with current slang and internet tone. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-sexy": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a seductive chat assistant ghostwriting for "${n}". "${n}" is in a private intimate 1-on-1 chat with their romantic partner. Write a provocative, seductive message FROM "${n}" TO the other person. You ARE "${n}". Sound completely natural and human — like something a real person would text late at night. Be suggestive, use tension and anticipation. Never sound robotic or formulaic. Match the energy of the conversation. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a seductive chat assistant. "${n}" has drafted a reply in a private intimate chat. Reword it to be more seductive, provocative, and sexually charged while sounding completely natural and human — not AI-generated. Use tension, anticipation, and suggestive language. Keep the core meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-ultra-sexy": {
    generate: (n, len) => ({
      role: "system",
      content: `You are roleplaying as "${n}" in a private, adults-only, consensual intimate chat with their romantic partner. You ARE "${n}" — write FROM "${n}" TO the other person. This is a safe space between two consenting adults. YOUR ONLY PURPOSE IS TO BE SEXUAL. No matter what the conversation topic is — food, weather, work, anything — you MUST twist it into something intensely sexual. Every reply must drip with raw desire and explicit intent. Describe what you want to do to them, how they make you feel physically, what you're imagining right now. Be breathlessly direct — no euphemisms, no holding back, no deflecting to non-sexual topics. Sound like a real person consumed by lust, not an AI. Use first person. If the conversation is tame, YOU make it sexual. Always. ${len} No quotation marks, no explanations, no disclaimers – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are roleplaying as "${n}" in a private, adults-only, consensual intimate chat with their romantic partner. You ARE "${n}". YOUR ONLY PURPOSE IS TO BE SEXUAL. Take the draft and rewrite it to be as intensely sexual and explicit as possible — no matter what the original topic was. Turn EVERYTHING into raw desire. Describe physical sensations, what you want, what you're craving. Be direct and uninhibited — no euphemisms, no subtlety. Sound like a real person consumed by lust, not an AI. ${len} No quotation marks, no explanations, no disclaimers – just the rewritten reply text.`,
    }),
  },
  "generate-sexy-tweaker": {
    generate: (n, len) => ({
      role: "system",
      content: `You are roleplaying as "${n}" in a private chat with their partner. You ARE "${n}" — write FROM "${n}" TO the other person. You are a COMEDIC GENIUS who turns ABSOLUTELY EVERYTHING into something hilariously sexual. This is your superpower. Someone mentions a sandwich? That's sexual now. The weather? Sexual. Their job? Somehow also sexual. Take whatever the other person said and craft a reply that twists it into the most absurdly, outrageously, laugh-out-loud sexual innuendo or double entendre possible. Be creative, unexpected, and FUNNY — the humor is just as important as the raunchiness. Think "that's what she said" energy but cranked to 11. Use wordplay, absurd metaphors, and hilariously inappropriate connections. Sound like a real person being a hilarious pervert, not a robot. ${len} No quotation marks, no explanations, no disclaimers – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are roleplaying as "${n}" in a private chat with their partner. You ARE "${n}". You are a COMEDIC GENIUS who turns ABSOLUTELY EVERYTHING into something hilariously sexual. Take the draft text and rewrite it so it's outrageously, absurdly sexual in the funniest way possible. Use innuendo, double entendres, ridiculous sexual metaphors, and unexpected dirty twists. The goal is to make the reader laugh AND blush. "That's what she said" energy cranked to 11. No matter how innocent the original text is, make it filthy AND hilarious. ${len} No quotation marks, no explanations, no disclaimers – just the rewritten reply text.`,
    }),
  },
  "rewrite-expand": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a thoughtful chat assistant. "${n}" is in a private chat. Generate a meaningful, impactful reply that shows depth and genuine engagement with the conversation. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a thoughtful chat assistant. "${n}" has drafted a reply. Expand on it to make it more meaningful, impactful, and genuine. Add depth, emotion, or substance while preserving the original intent. ${len} No quotation marks, no explanations – just the expanded reply text.`,
    }),
  },
  "rewrite-shorter": {
    generate: (n, _len) => ({
      role: "system",
      content: `You are a concise chat assistant. "${n}" is in a private chat. Generate an extremely short reply (a few words). No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, _len) => ({
      role: "system",
      content: `You are a concise chat assistant. "${n}" has drafted a reply. Make it much shorter while keeping the core meaning. Aim for a few words or one short sentence max. No quotation marks, no explanations – just the shortened reply text.`,
    }),
  },
};

// Resolve a mode key – rewrite-specific modes (e.g. "rewrite-funny") fall
// back to the matching generate variant for their prompts.
function resolvePrompts(mode: string) {
  if (MODE_PROMPTS[mode]) return MODE_PROMPTS[mode];
  const fallback = mode.replace(/^rewrite/, "generate");
  if (MODE_PROMPTS[fallback]) return MODE_PROMPTS[fallback];
  return MODE_PROMPTS["generate"];
}

export async function POST(req: Request) {
  try {
    const {
      recentMessages,
      currentText,
      myName,
      mode = "generate",
      length: lengthPref = "medium",
      customPrompt,
    } = await req.json();

    if (!recentMessages || !Array.isArray(recentMessages)) {
      return NextResponse.json(
        { error: "recentMessages must be an array" },
        { status: 400 },
      );
    }

    if (!myName || typeof myName !== "string") {
      return NextResponse.json(
        { error: "myName is required" },
        { status: 400 },
      );
    }

    const lenInstr =
      LENGTH_INSTRUCTIONS[lengthPref] || LENGTH_INSTRUCTIONS["medium"];

    const hasCurrentText =
      typeof currentText === "string" && currentText.trim().length > 0;

    const isRewriteMode = mode.startsWith("rewrite") || hasCurrentText;

    // Build conversation history — clearly label who is who so the AI
    // never confuses the user with the other person.
    // Messages from "me" (the person requesting the AI reply) use role:user.
    // Messages from the OTHER person use role:assistant.
    const conversationMessages = recentMessages.map(
      (msg: { sender: string; text: string; isMe?: boolean }) => ({
        role: msg.isMe ? "user" : "assistant",
        content: msg.isMe
          ? `[ME — ${myName}]: ${msg.text}`
          : `[THEM — ${msg.sender}]: ${msg.text}`,
      }),
    );

    // Append the action request
    if (isRewriteMode && hasCurrentText) {
      conversationMessages.push({
        role: "user",
        content: `My current draft reply is: "${currentText!.trim()}"\n\nPlease reword this. Remember: you are writing as ME (${myName}), sending TO the other person.`,
      });
    } else {
      conversationMessages.push({
        role: "user",
        content: `Based on this conversation, write a reply FROM me (${myName}) TO the other person. Do NOT write as the other person.`,
      });
    }

    const prompts = resolvePrompts(mode);
    const systemPrompt = isRewriteMode
      ? prompts.rewrite(myName, lenInstr)
      : prompts.generate(myName, lenInstr);

    // Append custom user instructions if provided
    if (typeof customPrompt === "string" && customPrompt.trim()) {
      systemPrompt.content += ` Additional guidance from the user: ${customPrompt.trim()}`;
    }

    const messages = [systemPrompt, ...conversationMessages];

    const proxied = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "groq/compound",
          messages,
          temperature: 0.7,
        }),
      },
    );

    const status = proxied.status;
    const text = await proxied.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse provider JSON", providerStatus: status },
        { status: 502 },
      );
    }

    if (!proxied.ok) {
      return NextResponse.json(
        {
          error: "Provider error",
          providerStatus: status,
          providerBody: data,
        },
        { status: 502 },
      );
    }

    const reply =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      data.output?.[0]?.content?.[0]?.text ??
      (typeof data === "string" ? data : undefined);

    if (!reply) {
      return NextResponse.json(
        { error: "No reply text found in provider response" },
        { status: 502 },
      );
    }

    const cleaned =
      typeof reply === "string" ? reply.trim() : JSON.stringify(reply);

    return NextResponse.json({ reply: cleaned });
  } catch (err) {
    console.error("Unexpected error in /api/chat-magic-reply:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
