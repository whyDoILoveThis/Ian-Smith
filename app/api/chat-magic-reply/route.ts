import { NextResponse } from "next/server";

/**
 * POST /api/chat-magic-reply
 *
 * Body:
 *   recentMessages: { sender: string; text: string }[]   – last ~20 messages
 *   currentText?:   string                                – text already in the input field (if any)
 *   myName:         string                                – the current user's screen name
 *
 * If currentText is provided, the AI rewords it into a better reply.
 * If currentText is empty/absent, the AI generates a short reply from scratch.
 */

const SYSTEM_PROMPT_GENERATE = (myName: string) => ({
  role: "system",
  content: `You are a helpful chat assistant. The user "${myName}" is in a private chat conversation. Based on the recent conversation history provided, generate a short, natural, and contextually appropriate reply that "${myName}" could send next. Keep it casual, conversational, and brief (1-2 sentences max). Do not use quotation marks around your reply. Do not explain yourself. Just output the reply text and nothing else.`,
});

const SYSTEM_PROMPT_REWORD = (myName: string) => ({
  role: "system",
  content: `You are a helpful chat assistant. The user "${myName}" is in a private chat conversation and has drafted a reply. Based on the recent conversation history provided, reword their draft into a better, more natural, and contextually fitting reply. Keep the same intent and meaning but improve the wording. Keep it casual and brief. Do not use quotation marks around your reply. Do not explain yourself. Just output the improved reply text and nothing else.`,
});

export async function POST(req: Request) {
  try {
    const { recentMessages, currentText, myName } = await req.json();

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

    const hasCurrentText =
      typeof currentText === "string" && currentText.trim().length > 0;

    // Build conversation history for the AI
    const conversationMessages = recentMessages.map(
      (msg: { sender: string; text: string }) => ({
        role: msg.sender === myName ? "user" : "assistant",
        content: `${msg.sender}: ${msg.text}`,
      }),
    );

    // If rewriting, append the draft as the final user message
    if (hasCurrentText) {
      conversationMessages.push({
        role: "user",
        content: `My current draft reply is: "${currentText.trim()}"\n\nPlease reword this to be a better reply.`,
      });
    } else {
      conversationMessages.push({
        role: "user",
        content: `Based on this conversation, suggest a short reply I could send next.`,
      });
    }

    const systemPrompt = hasCurrentText
      ? SYSTEM_PROMPT_REWORD(myName)
      : SYSTEM_PROMPT_GENERATE(myName);

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
