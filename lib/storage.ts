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
 */
export async function createConversation(
  conversationId?: string
): Promise<Conversation> {
  const id = conversationId || generateUUID();

  const conv = await prisma.conversation.create({
    data: {
      id,
      title: "New Conversation",
      archived: false,
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
 */
export async function getConversation(
  conversationId: string
): Promise<Conversation | null> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
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
 */
export async function listConversations(
  includeArchived: boolean = false
): Promise<ConversationMetadata[]> {
  const conversations = await prisma.conversation.findMany({
    where: includeArchived ? {} : { archived: false },
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
 */
export async function archiveConversation(
  conversationId: string,
  archived: boolean = true
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { archived },
  });
}

/**
 * Delete a conversation permanently.
 */
export async function deleteConversation(
  conversationId: string
): Promise<void> {
  await prisma.conversation.delete({
    where: { id: conversationId },
  });
}

/**
 * Calculate overall scores across all conversations.
 */
export async function getOverallScores(): Promise<OverallScores> {
  // Get all non-archived assistant messages with stage2 data
  const allMessages = await prisma.message.findMany({
    where: {
      role: "assistant",
      conversation: { archived: false },
    },
    select: { stage2: true },
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
    const stage2Data = msg.stage2 as Stage2Result[] | null;

    if (!stage2Data || !Array.isArray(stage2Data)) continue;

    totalConversations++;
    const numModels = stage2Data.length;

    for (const rankingResult of stage2Data) {
      const parsedRanking = rankingResult.parsed_ranking || [];
      if (parsedRanking.length === 0) continue;

      totalRankings++;

      // Award points based on position (inverse ranking)
      for (let position = 0; position < parsedRanking.length; position++) {
        const rankedLabel = parsedRanking[position];
        const points = numModels - position;

        if (!modelScores.has(rankedLabel)) {
          modelScores.set(rankedLabel, {
            total_points: 0,
            rankings_received: 0,
            first_places: 0,
            second_places: 0,
            third_places: 0,
            position_history: [],
          });
        }

        const scores = modelScores.get(rankedLabel)!;
        scores.total_points += points;
        scores.rankings_received++;
        scores.position_history.push(position + 1);

        if (position === 0) scores.first_places++;
        else if (position === 1) scores.second_places++;
        else if (position === 2) scores.third_places++;
      }
    }
  }

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
