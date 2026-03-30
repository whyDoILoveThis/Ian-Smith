/**
 * Client-side API callers for the smarter-ai-pipeline routes.
 * Each function maps to one API endpoint and handles error surfacing.
 */

async function safeFetch<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errBody.error || `API error ${res.status}`);
  }

  return res.json();
}

/** Decompose a prompt into focal points */
export async function apiDecompose(prompt: string): Promise<string[]> {
  const data = await safeFetch<{ focalPoints: string[] }>(
    "/api/smarter-ai-pipeline/focal-point-generator",
    { prompt }
  );
  return data.focalPoints;
}

/** Execute a focal point and get a confidence-scored response */
export async function apiExecuteFocalPoint(
  prompt: string,
  focalPoint: string
): Promise<{ response: string; confidence: number; confidenceReasoning: string }> {
  return safeFetch("/api/smarter-ai-pipeline/focal-point-generator/other-generator", {
    prompt,
    focalPoint,
  });
}

/** Generate todos from a focal point analysis */
export async function apiGenerateTodos(
  focalPoint: string,
  analysis: string
): Promise<string[]> {
  const data = await safeFetch<{ todos: string[] }>(
    "/api/smarter-ai-pipeline/focal-point-generator/todo-generator",
    { focalPoint, analysis }
  );
  return data.todos;
}

/** Execute a single todo and get a confidence-scored response */
export async function apiExecuteTodo(
  prompt: string,
  focalPoint: string,
  todo: string
): Promise<{ response: string; confidence: number; confidenceReasoning: string }> {
  return safeFetch("/api/smarter-ai-pipeline/focal-point-generator/another-generator", {
    prompt,
    focalPoint,
    todo,
  });
}

/** Synthesize all results into a final answer */
export async function apiSynthesize(
  prompt: string,
  analyses: {
    focalPoint: string;
    analysis: string;
    todos: { text: string; result: string }[];
  }[]
): Promise<string> {
  const data = await safeFetch<{ synthesis: string }>(
    "/api/smarter-ai-pipeline/synthesize",
    { prompt, analyses }
  );
  return data.synthesis;
}

/** Fast mode: single-shot chat with optional history */
export async function apiFastChat(
  prompt: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const data = await safeFetch<{ reply: string }>(
    "/api/smarter-ai-pipeline/fast-chat",
    { prompt, history }
  );
  return data.reply;
}

/** Medium mode: short summary for a focal point + its todos */
export async function apiMediumSummary(
  prompt: string,
  focalPoint: string,
  todos: string[]
): Promise<string> {
  const data = await safeFetch<{ summary: string }>(
    "/api/smarter-ai-pipeline/medium-summary",
    { prompt, focalPoint, todos }
  );
  return data.summary;
}
