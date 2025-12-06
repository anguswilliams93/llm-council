/**
 * Configuration for the LLM Council.
 */

// OpenRouter API key - must be set in environment variables
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

// Council members - list of OpenRouter model identifiers
export const COUNCIL_MODELS = [
  "openai/gpt-4.1",
  "google/gemini-2.5-pro-preview-06-05",
  "x-ai/grok-4-0530",
  "anthropic/claude-sonnet-4-20250514",
];

// Chairman model - synthesizes final response
export const CHAIRMAN_MODEL = "x-ai/grok-4-0530";

// OpenRouter API endpoint
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model for title generation (fast and cheap)
export const TITLE_MODEL = "google/gemini-2.5-flash";
