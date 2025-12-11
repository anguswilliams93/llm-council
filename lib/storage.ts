/**
 * Postgres storage for conversations using Prisma.
 */

import { prisma } from "./prisma";
import type {
  Conversation,
  ConversationMetadata,
  Message,
  Stage1Result,
  Stage2Result,
  Stage3Result,
} from "./types";

// Simple UUID generation without external dependency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface ModelScore {
  model: string;
  description?: string;
  total_points: number;
  rankings_received: number;
  first_places: number;
  second_places: number;
  third_places: number;
  average_position: number;
  average_points: number;
}

export interface OverallScores {
  leaderboard: ModelScore[];
  total_conversations_analyzed: number;
  total_rankings_processed: number;
}

/**
 * Create a new conversation.
 * @param conversationId - Optional specific ID
 * @param userId - Optional user ID for row-level security
 */
export async function createConversation(
  conversationId?: string,
  userId?: string
): Promise<Conversation> {
  const id = conversationId || generateUUID();

  const conv = await prisma.conversation.create({
    data: {
      id,
      title: "New Conversation",
      archived: false,
      user_id: userId || null,
    },
  });

  return {
    id: conv.id,
    created_at: conv.created_at.toISOString(),
    title: conv.title,
    messages: [],
  };
}

/**
 * Get a conversation with all its messages.
 * @param conversationId - Conversation ID
 * @param userId - Optional user ID for row-level security
 */
export async function getConversation(
  conversationId: string,
  userId?: string
): Promise<Conversation | null> {
  const whereClause: { id: string; user_id?: string | null } = { id: conversationId };

  // If userId provided, ensure user owns the conversation
  // If userId is undefined, we allow access (for backward compatibility with guest users)
  if (userId !== undefined) {
    whereClause.user_id = userId;
  }

  const conv = await prisma.conversation.findFirst({
    where: whereClause,
    include: {
      messages: {
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!conv) {
    return null;
  }

  const messages: Message[] = conv.messages.map((msg) => {
    if (msg.role === "user") {
      return {
        role: "user" as const,
        content: msg.content || "",
        timestamp: msg.timestamp.toISOString(),
      };
    } else {
      return {
        role: "assistant" as const,
        stage1: msg.stage1 as unknown as Stage1Result[] | undefined,
        stage2: msg.stage2 as unknown as Stage2Result[] | undefined,
        stage3: msg.stage3 as unknown as Stage3Result | undefined,
        timestamp: msg.timestamp.toISOString(),
      };
    }
  });

  return {
    id: conv.id,
    created_at: conv.created_at.toISOString(),
    title: conv.title,
    messages,
  };
}

/**
 * List all conversations (metadata only).
 * @param includeArchived - Include archived conversations
 * @param userId - Optional user ID for row-level security
 */
export async function listConversations(
  includeArchived: boolean = false,
  userId?: string
): Promise<ConversationMetadata[]> {
  const whereClause: { archived?: boolean; user_id?: string | null } = {};

  if (!includeArchived) {
    whereClause.archived = false;
  }

  // Filter by user if userId provided
  if (userId !== undefined) {
    whereClause.user_id = userId;
  }

  const conversations = await prisma.conversation.findMany({
    where: whereClause,
    include: {
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return conversations.map((conv) => ({
    id: conv.id,
    created_at: conv.created_at.toISOString(),
    title: conv.title,
    message_count: conv._count.messages,
    archived: conv.archived,
  }));
}

/**
 * Add a user message to a conversation.
 */
export async function addUserMessage(
  conversationId: string,
  content: string
): Promise<void> {
  await prisma.message.create({
    data: {
      conversation_id: conversationId,
      role: "user",
      content,
    },
  });
}

/**
 * Add an assistant message with all stages to a conversation.
 */
export async function addAssistantMessage(
  conversationId: string,
  stage1: Stage1Result[],
  stage2: Stage2Result[],
  stage3: Stage3Result
): Promise<void> {
  await prisma.message.create({
    data: {
      conversation_id: conversationId,
      role: "assistant",
      stage1: stage1 as unknown as object,
      stage2: stage2 as unknown as object,
      stage3: stage3 as unknown as object,
    },
  });
}

/**
 * Update conversation title.
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { title },
  });
}

/**
 * Archive or unarchive a conversation.
 * @param conversationId - Conversation ID
 * @param archived - Whether to archive or unarchive
 * @param userId - Optional user ID for row-level security
 */
export async function archiveConversation(
  conversationId: string,
  archived: boolean = true,
  userId?: string
): Promise<boolean> {
  const whereClause: { id: string; user_id?: string | null } = { id: conversationId };
  if (userId !== undefined) {
    whereClause.user_id = userId;
  }

  const result = await prisma.conversation.updateMany({
    where: whereClause,
    data: { archived },
  });

  return result.count > 0;
}

/**
 * Delete a conversation permanently.
 * @param conversationId - Conversation ID
 * @param userId - Optional user ID for row-level security
 */
export async function deleteConversation(
  conversationId: string,
  userId?: string
): Promise<boolean> {
  const whereClause: { id: string; user_id?: string | null } = { id: conversationId };
  if (userId !== undefined) {
    whereClause.user_id = userId;
  }

  const result = await prisma.conversation.deleteMany({
    where: whereClause,
  });

  return result.count > 0;
}

/**
 * Calculate overall scores across all conversations.
 * Uses actual model names from Stage 1 data instead of anonymous labels.
 */
export async function getOverallScores(): Promise<OverallScores> {
  // Get all non-archived assistant messages with stage1 and stage2 data
  const allMessages = await prisma.message.findMany({
    where: {
      role: "assistant",
      conversation: { archived: false },
    },
    select: { stage1: true, stage2: true },
  });

  // Filter to only messages that have stage2 data
  const messages = allMessages.filter((m) => m.stage2 !== null);

  // Track scores per model
  const modelScores: Map<
    string,
    {
      total_points: number;
      rankings_received: number;
      first_places: number;
      second_places: number;
      third_places: number;
      position_history: number[];
    }
  > = new Map();

  let totalConversations = 0;
  let totalRankings = 0;

  for (const msg of messages) {
    const stage1Data = msg.stage1 as Stage1Result[] | null;
    const stage2Data = msg.stage2 as Stage2Result[] | null;

    if (!stage2Data || !Array.isArray(stage2Data)) continue;

    // Build label_to_model mapping from Stage 1 data
    const labelToModel: Record<string, string> = {};
    if (stage1Data && Array.isArray(stage1Data)) {
      const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
      stage1Data.forEach((result, index) => {
        if (index < labels.length) {
          labelToModel[`Response ${labels[index]}`] = result.model;
        }
      });
    }

    totalConversations++;
    const numModels = stage2Data.length;

    for (const rankingResult of stage2Data) {
      const parsedRanking = rankingResult.parsed_ranking || [];
      if (parsedRanking.length === 0) continue;

      totalRankings++;

      // Award points based on position (inverse ranking)
      for (let position = 0; position < parsedRanking.length; position++) {
        const rankedLabel = parsedRanking[position];
        // Map anonymous label to actual model name, fallback to label if not found
        const modelName = labelToModel[rankedLabel] || rankedLabel;
        const points = numModels - position;

        if (!modelScores.has(modelName)) {
          modelScores.set(modelName, {
            total_points: 0,
            rankings_received: 0,
            first_places: 0,
            second_places: 0,
            third_places: 0,
            position_history: [],
          });
        }

        const scores = modelScores.get(modelName)!;
        scores.total_points += points;
        scores.rankings_received++;
        scores.position_history.push(position + 1);

        if (position === 0) scores.first_places++;
        else if (position === 1) scores.second_places++;
        else if (position === 2) scores.third_places++;
      }
    }
  }

  // Get all model IDs that have scores
  const modelIds = Array.from(modelScores.keys());

  // Fetch descriptions from LLMModel table
  const modelDescriptions = await prisma.lLMModel.findMany({
    where: { id: { in: modelIds } },
    select: { id: true, description: true },
  });

  const descriptionMap = new Map<string, string | null>(
    modelDescriptions.map((m: { id: string; description: string | null }) => [m.id, m.description])
  );

  // Calculate averages and build leaderboard
  const leaderboard: ModelScore[] = [];
  for (const [model, scores] of modelScores) {
    if (scores.rankings_received > 0) {
      const avgPosition =
        scores.position_history.reduce((a, b) => a + b, 0) /
        scores.position_history.length;
      const avgPoints = scores.total_points / scores.rankings_received;

      leaderboard.push({
        model,
        description: descriptionMap.get(model) ?? undefined,
        total_points: scores.total_points,
        rankings_received: scores.rankings_received,
        first_places: scores.first_places,
        second_places: scores.second_places,
        third_places: scores.third_places,
        average_position: Math.round(avgPosition * 100) / 100,
        average_points: Math.round(avgPoints * 100) / 100,
      });
    }
  }

  // Sort by total points descending
  leaderboard.sort((a, b) => b.total_points - a.total_points);

  return {
    leaderboard,
    total_conversations_analyzed: totalConversations,
    total_rankings_processed: totalRankings,
  };
}
