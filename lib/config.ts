/**
 * Configuration for the LLM Council.
 */

// OpenRouter API key - must be set in environment variables
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

// Council members - list of OpenRouter model identifiers
export const COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
    "anthropic/claude-sonnet-4.5",
    "x-ai/grok-4.1-fast",
    "deepseek/deepseek-v3.2"
];

// Chairman model - synthesizes final response
export const CHAIRMAN_MODEL = "x-ai/grok-4.1-fast";

// OpenRouter API endpoint
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model for title generation (fast and cheap)
export const TITLE_MODEL = "google/gemini-2.5-flash";
