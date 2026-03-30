/**
 * The AI model used across ALL pipeline stages.
 * Change this single value to switch models globally.
 */
export const PIPELINE_MODEL = "llama-3.1-8b-instant";

/** Confidence threshold — below this triggers a rerun */
export const CONFIDENCE_THRESHOLD = 80;

/** Maximum retry attempts per focal point or todo before accepting the result */
export const MAX_RETRIES = 3;

/** Delay between API requests in ms to respect Groq's minute-based rate limits */
export const REQUEST_DELAY_MS = 3500;

/** Groq API endpoint */
export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Temperature for generation tasks */
export const GENERATION_TEMPERATURE = 0.7;

/** Temperature for evaluation/scoring (lower = more consistent) */
export const EVALUATION_TEMPERATURE = 0.3;
