/**
 * OpenRouter API client for making LLM requests.
 */

import { OPENROUTER_API_KEY, OPENROUTER_API_URL } from "./config";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ModelResponse {
  content: string | null;
  reasoning_details?: string | null;
}

/**
 * Query a single model via OpenRouter API.
 *
 * @param model - OpenRouter model identifier (e.g., "openai/gpt-4o")
 * @param messages - List of message objects with 'role' and 'content'
 * @param timeout - Request timeout in milliseconds (default: 120000)
 * @returns Response object with 'content' and optional 'reasoning_details', or null if failed
 */
export async function queryModel(
  model: string,
  messages: ChatMessage[],
  timeout: number = 120000
): Promise<ModelResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Error querying model ${model}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    return {
      content: message?.content ?? null,
      reasoning_details: message?.reasoning_details ?? null,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error querying model ${model}:`, error);
    return null;
  }
}

/**
 * Query multiple models in parallel.
 *
 * @param models - List of OpenRouter model identifiers
 * @param messages - List of message objects to send to each model
 * @returns Map of model identifier to response object (or null if failed)
 */
export async function queryModelsParallel(
  models: string[],
  messages: ChatMessage[]
): Promise<Map<string, ModelResponse | null>> {
  const results = await Promise.all(
    models.map(async (model) => {
      const response = await queryModel(model, messages);
      return { model, response };
    })
  );

  return new Map(results.map(({ model, response }) => [model, response]));
}
