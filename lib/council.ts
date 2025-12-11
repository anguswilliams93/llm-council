/**
 * 3-stage LLM Council orchestration.
 */

import { queryModelsParallel, queryModel, type ChatMessage } from "./openrouter";
import { COUNCIL_MODELS, CHAIRMAN_MODEL, TITLE_MODEL } from "./config";
import type { Stage1Result, Stage2Result, Stage3Result, CouncilMetadata, Message } from "./types";

// Re-export ChatMessage for use in other modules
export type { ChatMessage };

/**
 * User model configuration override
 */
export interface UserModelConfig {
  chairmanModel: string;
  councilModels: string[];
}

/**
 * Build conversation history from previous messages for context.
 * Includes user questions and the final synthesis (Stage 3) responses.
 */
export function buildConversationHistory(messages: Message[]): ChatMessage[] {
  const history: ChatMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      history.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant" && msg.stage3?.response) {
      // Include the final synthesis as the assistant's response
      history.push({ role: "assistant", content: msg.stage3.response });
    }
  }

  return history;
}

/**
 * Get the effective council models to use.
 * Uses user's models if provided, otherwise falls back to defaults.
 */
function getCouncilModels(userConfig?: UserModelConfig): string[] {
  if (userConfig?.councilModels && userConfig.councilModels.length > 0) {
    return userConfig.councilModels;
  }
  return COUNCIL_MODELS;
}

/**
 * Get the effective chairman model to use.
 * Uses user's model if provided, otherwise falls back to default.
 */
function getChairmanModel(userConfig?: UserModelConfig): string {
  if (userConfig?.chairmanModel) {
    return userConfig.chairmanModel;
  }
  return CHAIRMAN_MODEL;
}

/**
 * Stage 1: Collect individual responses from all council models.
 *
 * @param userQuery - The user's question
 * @param userConfig - Optional user model configuration
 * @param conversationHistory - Previous messages for context (optional)
 * @returns List of results with 'model' and 'response' keys
 */
export async function stage1CollectResponses(
  userQuery: string,
  userConfig?: UserModelConfig,
  conversationHistory?: ChatMessage[]
): Promise<Stage1Result[]> {
  // Build messages array: history + current query
  const messages: ChatMessage[] = [
    ...(conversationHistory || []),
    { role: "user", content: userQuery }
  ];
  const councilModels = getCouncilModels(userConfig);

  // Query all models in parallel
  const responses = await queryModelsParallel(councilModels, messages);

  // Format results
  const stage1Results: Stage1Result[] = [];
  for (const [model, response] of responses) {
    if (response !== null) {
      stage1Results.push({
        model,
        response: response.content || "",
      });
    }
  }

  return stage1Results;
}

/**
 * Stage 2: Each model ranks the anonymized responses.
 *
 * @param userQuery - The original user query
 * @param stage1Results - Results from Stage 1
 * @param userConfig - Optional user model configuration
 * @returns Tuple of [rankings list, label_to_model mapping]
 */
export async function stage2CollectRankings(
  userQuery: string,
  stage1Results: Stage1Result[],
  userConfig?: UserModelConfig
): Promise<{ rankings: Stage2Result[]; labelToModel: Record<string, string> }> {
  const councilModels = getCouncilModels(userConfig);
  // Create anonymized labels for responses (Response A, Response B, etc.)
  const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i)); // A, B, C, ...

  // Create mapping from label to model name
  const labelToModel: Record<string, string> = {};
  labels.forEach((label, i) => {
    labelToModel[`Response ${label}`] = stage1Results[i].model;
  });

  // Build the ranking prompt
  const responsesText = labels
    .map(
      (label, i) =>
        `Response ${label}:\n${stage1Results[i].response}`
    )
    .join("\n\n");

  const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${userQuery}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

  const messages: ChatMessage[] = [{ role: "user", content: rankingPrompt }];

  // Get rankings from all council models in parallel
  const responses = await queryModelsParallel(councilModels, messages);

  // Format results
  const stage2Results: Stage2Result[] = [];
  for (const [model, response] of responses) {
    if (response !== null) {
      const fullText = response.content || "";
      const parsedRanking = parseRankingFromText(fullText);
      stage2Results.push({
        model,
        ranking: fullText,
        parsed_ranking: parsedRanking,
      });
    }
  }

  return { rankings: stage2Results, labelToModel };
}

/**
 * Stage 3: Chairman synthesizes final response.
 *
 * @param userQuery - The original user query
 * @param stage1Results - Individual model responses from Stage 1
 * @param stage2Results - Rankings from Stage 2
 * @param userConfig - Optional user model configuration
 * @param conversationHistory - Previous messages for context (optional)
 * @returns Result with 'model' and 'response' keys
 */
export async function stage3SynthesizeFinal(
  userQuery: string,
  stage1Results: Stage1Result[],
  stage2Results: Stage2Result[],
  userConfig?: UserModelConfig,
  conversationHistory?: ChatMessage[]
): Promise<Stage3Result> {
  const chairmanModel = getChairmanModel(userConfig);
  // Build comprehensive context for chairman
  const stage1Text = stage1Results
    .map((result) => `Model: ${result.model}\nResponse: ${result.response}`)
    .join("\n\n");

  const stage2Text = stage2Results
    .map((result) => `Model: ${result.model}\nRanking: ${result.ranking}`)
    .join("\n\n");

  // Build conversation history context if available
  const historyContext = conversationHistory && conversationHistory.length > 0
    ? `\nCONVERSATION HISTORY (for context on follow-up questions):
${conversationHistory.map((msg, i) => `${msg.role === 'user' ? 'User' : 'Council'}: ${msg.content}`).join('\n\n')}\n\n`
    : '';

  const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.
${historyContext}
Original Question: ${userQuery}

STAGE 1 - Individual Responses:
${stage1Text}

STAGE 2 - Peer Rankings:
${stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`;

  const messages: ChatMessage[] = [{ role: "user", content: chairmanPrompt }];

  // Query the chairman model
  const response = await queryModel(chairmanModel, messages);

  if (response === null) {
    // Fallback if chairman fails
    return {
      model: chairmanModel,
      response: "Error: Unable to generate final synthesis.",
    };
  }

  return {
    model: chairmanModel,
    response: response.content || "",
  };
}

/**
 * Parse the FINAL RANKING section from the model's response.
 *
 * @param rankingText - The full text response from the model
 * @returns List of response labels in ranked order
 */
export function parseRankingFromText(rankingText: string): string[] {
  // Look for "FINAL RANKING:" section
  if (rankingText.includes("FINAL RANKING:")) {
    const parts = rankingText.split("FINAL RANKING:");
    if (parts.length >= 2) {
      const rankingSection = parts[1];

      // Try to extract numbered list format (e.g., "1. Response A")
      const numberedMatches = rankingSection.match(/\d+\.\s*Response [A-Z]/g);
      if (numberedMatches) {
        // Extract just the "Response X" part
        return numberedMatches.map((m) => {
          const match = m.match(/Response [A-Z]/);
          return match ? match[0] : "";
        }).filter(Boolean);
      }

      // Fallback: Extract all "Response X" patterns in order
      const matches = rankingSection.match(/Response [A-Z]/g);
      return matches || [];
    }
  }

  // Fallback: try to find any "Response X" patterns in order
  const matches = rankingText.match(/Response [A-Z]/g);
  return matches || [];
}

/**
 * Calculate aggregate rankings across all models.
 *
 * @param stage2Results - Rankings from each model
 * @param labelToModel - Mapping from anonymous labels to model names
 * @returns List of models with average rank, sorted best to worst
 */
export function calculateAggregateRankings(
  stage2Results: Stage2Result[],
  labelToModel: Record<string, string>
): CouncilMetadata["aggregate_rankings"] {
  // Track positions for each model
  const modelPositions: Map<string, number[]> = new Map();

  for (const ranking of stage2Results) {
    const parsedRanking = ranking.parsed_ranking;

    for (let position = 0; position < parsedRanking.length; position++) {
      const label = parsedRanking[position];
      if (label in labelToModel) {
        const modelName = labelToModel[label];
        if (!modelPositions.has(modelName)) {
          modelPositions.set(modelName, []);
        }
        modelPositions.get(modelName)!.push(position + 1);
      }
    }
  }

  // Calculate average position for each model
  const aggregate: CouncilMetadata["aggregate_rankings"] = [];
  for (const [model, positions] of modelPositions) {
    if (positions.length > 0) {
      const avgRank = positions.reduce((a, b) => a + b, 0) / positions.length;
      aggregate.push({
        model,
        average_rank: Math.round(avgRank * 100) / 100,
        rankings_count: positions.length,
      });
    }
  }

  // Sort by average rank (lower is better)
  aggregate.sort((a, b) => a.average_rank - b.average_rank);

  return aggregate;
}

/**
 * Generate a short title for a conversation based on the first user message.
 *
 * @param userQuery - The first user message
 * @returns A short title (3-5 words)
 */
export async function generateConversationTitle(
  userQuery: string
): Promise<string> {
  const titlePrompt = `Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: ${userQuery}

Title:`;

  const messages: ChatMessage[] = [{ role: "user", content: titlePrompt }];

  // Use gemini flash for title generation (fast and cheap)
  const response = await queryModel(TITLE_MODEL, messages, 30000);

  if (response === null) {
    // Fallback to a generic title
    return "New Conversation";
  }

  let title = (response.content || "New Conversation").trim();

  // Clean up the title - remove quotes, limit length
  title = title.replace(/^["']|["']$/g, "");

  // Truncate if too long
  if (title.length > 50) {
    title = title.substring(0, 47) + "...";
  }

  return title;
}

/**
 * Run the complete 3-stage council process.
 *
 * @param userQuery - The user's question
 * @param userConfig - Optional user model configuration
 * @param conversationHistory - Previous messages for context (optional)
 * @returns Object with stage1, stage2, stage3 results and metadata
 */
export async function runFullCouncil(
  userQuery: string,
  userConfig?: UserModelConfig,
  conversationHistory?: ChatMessage[]
): Promise<{
  stage1: Stage1Result[];
  stage2: Stage2Result[];
  stage3: Stage3Result;
  metadata: CouncilMetadata;
}> {
  // Stage 1: Collect individual responses (with history for context)
  const stage1Results = await stage1CollectResponses(userQuery, userConfig, conversationHistory);

  // If no models responded successfully, return error
  if (stage1Results.length === 0) {
    return {
      stage1: [],
      stage2: [],
      stage3: {
        model: "error",
        response: "All models failed to respond. Please try again.",
      },
      metadata: {
        label_to_model: {},
        aggregate_rankings: [],
      },
    };
  }

  // Stage 2: Collect rankings
  const { rankings: stage2Results, labelToModel } = await stage2CollectRankings(
    userQuery,
    stage1Results,
    userConfig
  );

  // Calculate aggregate rankings
  const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);

  // Stage 3: Synthesize final answer (with history for context)
  const stage3Result = await stage3SynthesizeFinal(
    userQuery,
    stage1Results,
    stage2Results,
    userConfig,
    conversationHistory
  );

  return {
    stage1: stage1Results,
    stage2: stage2Results,
    stage3: stage3Result,
    metadata: {
      label_to_model: labelToModel,
      aggregate_rankings: aggregateRankings,
    },
  };
}
