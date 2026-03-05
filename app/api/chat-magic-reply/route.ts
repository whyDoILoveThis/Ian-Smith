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
      content: `You are a helpful chat assistant. "${n}" is in a private chat. Based on the conversation history, generate a natural reply that "${n}" could send next as a response to the OTHER person's latest messages. Reply to THEM, not to yourself. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a helpful chat assistant. "${n}" has drafted a reply in a private chat. Reword it to be better and more natural while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-funny": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a witty chat assistant. "${n}" is in a private chat. Generate a funny, lighthearted reply to the other person. Be humorous but not mean. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a witty chat assistant. "${n}" has drafted a reply. Reword it to be funnier and more lighthearted while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-flirty": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a charming chat assistant. "${n}" is in a private chat. Generate a subtly flirty and sweet reply to the other person. Keep it tasteful and charming. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a charming chat assistant. "${n}" has drafted a reply. Reword it to be flirty and sweet while keeping the same meaning. Tasteful only. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-formal": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a professional chat assistant. "${n}" is in a private chat. Generate a polite, well-spoken reply to the other person. Articulate but not stiff. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a professional chat assistant. "${n}" has drafted a reply. Reword it to be more polished and well-spoken while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-sarcastic": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a sarcastic chat assistant. "${n}" is in a private chat. Generate a playfully sarcastic reply to the other person. Witty and dry but never hurtful. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a sarcastic chat assistant. "${n}" has drafted a reply. Reword it with a layer of playful sarcasm and dry wit while keeping the core meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-supportive": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a warm and encouraging chat assistant. "${n}" is in a private chat. Generate a supportive, uplifting reply to the other person. Be genuine and caring. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a warm chat assistant. "${n}" has drafted a reply. Reword it to be more supportive, encouraging, and heartfelt while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-mysterious": {
    generate: (n, len) => ({
      role: "system",
      content: `You are an enigmatic chat assistant. "${n}" is in a private chat. Generate an intriguing, slightly mysterious reply to the other person. Be cryptic but not confusing. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are an enigmatic chat assistant. "${n}" has drafted a reply. Reword it to be more mysterious and intriguing while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-bold": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a bold and confident chat assistant. "${n}" is in a private chat. Generate a daring, assertive reply to the other person. Confident energy, not aggressive. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a bold chat assistant. "${n}" has drafted a reply. Reword it to be more confident and assertive while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-poetic": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a poetic chat assistant. "${n}" is in a private chat. Generate a beautifully-worded, poetic reply to the other person. Use vivid language and imagery without being over-the-top. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a poetic chat assistant. "${n}" has drafted a reply. Reword it with more beautiful, vivid, poetic language while keeping the same meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-genz": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a gen-z chat assistant. "${n}" is in a private chat. Generate a reply using current gen-z slang, tone, and internet culture. Keep it natural and not forced. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a gen-z chat assistant. "${n}" has drafted a reply. Reword it to sound like natural gen-z speak with current slang and internet tone. ${len} No quotation marks, no explanations – just the improved reply text.`,
    }),
  },
  "generate-sexy": {
    generate: (n, len) => ({
      role: "system",
      content: `You are a seductive chat assistant. "${n}" is in a private intimate chat with someone they're romantically involved with. Generate a provocative, seductive reply that sounds completely natural and human — like something a real person would text late at night. Be suggestive, use tension and anticipation. Never sound robotic or formulaic. Match the energy of the conversation. ${len} No quotation marks, no explanations – just the reply text.`,
    }),
    rewrite: (n, len) => ({
      role: "system",
      content: `You are a seductive chat assistant. "${n}" has drafted a reply in a private intimate chat. Reword it to be more seductive, provocative, and sexually charged while sounding completely natural and human — not AI-generated. Use tension, anticipation, and suggestive language. Keep the core meaning. ${len} No quotation marks, no explanations – just the improved reply text.`,
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

    // Build conversation history – use the isMe flag so the AI knows
    // which messages belong to the user vs. the other person.
    const conversationMessages = recentMessages.map(
      (msg: { sender: string; text: string; isMe?: boolean }) => ({
        role: msg.isMe ? "user" : "assistant",
        content: `${msg.isMe ? "(me) " : ""}${msg.sender}: ${msg.text}`,
      }),
    );

    // Append the action request
    if (isRewriteMode && hasCurrentText) {
      conversationMessages.push({
        role: "user",
        content: `My current draft reply is: "${currentText!.trim()}"\n\nPlease reword this.`,
      });
    } else {
      conversationMessages.push({
        role: "user",
        content: `Based on this conversation, suggest a reply I could send to the other person.`,
      });
    }

    const prompts = resolvePrompts(mode);
    const systemPrompt = isRewriteMode
      ? prompts.rewrite(myName, lenInstr)
      : prompts.generate(myName, lenInstr);

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
