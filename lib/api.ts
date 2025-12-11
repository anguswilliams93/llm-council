/**
 * API client for communicating with the LLM Council backend
 */

// Use relative paths for Next.js API routes (same-origin)
const API_BASE = "";

// Import types from the central types file
import type {
  ConversationMetadata,
  Stage1Result,
  Stage2Result,
  Stage3Result,
  Message,
  Conversation,
} from "./types";

// Re-export types for convenience
export type {
  ConversationMetadata,
  Stage1Result,
  Stage2Result,
  Stage3Result,
  Message,
  Conversation,
};

export interface CouncilResponse {
  stage1: Stage1Result[];
  stage2: Stage2Result[];
  stage3: Stage3Result;
  metadata: {
    label_to_model: Record<string, string>;
    aggregate_rankings: Array<{
      model: string;
      average_rank: number;
      rankings_count: number;
    }>;
  };
}

export interface StreamEvent {
  type:
    | "stage1_start"
    | "stage1_complete"
    | "stage2_start"
    | "stage2_complete"
    | "stage3_start"
    | "stage3_complete"
    | "title_complete"
    | "complete"
    | "error";
  data?: Stage1Result[] | Stage2Result[] | Stage3Result | { title: string };
  metadata?: {
    label_to_model: Record<string, string>;
    aggregate_rankings: Array<{
      model: string;
      average_rank: number;
      rankings_count: number;
    }>;
  };
  message?: string;
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
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api`);
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Get overall scores across all conversations
 */
export async function getOverallScores(): Promise<OverallScores> {
  const response = await fetch(`${API_BASE}/api/scores`);
  if (!response.ok) {
    throw new Error("Failed to fetch overall scores");
  }
  return response.json();
}

/**
 * List all conversations for a user
 */
export async function listConversations(includeArchived: boolean = false, userId?: string): Promise<ConversationMetadata[]> {
  let url = `${API_BASE}/api/conversations?include_archived=${includeArchived}`;
  if (userId) {
    url += `&userId=${encodeURIComponent(userId)}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return response.json();
}

/**
 * Create a new conversation
 */
export async function createConversation(userId?: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    throw new Error("Failed to create conversation");
  }
  return response.json();
}

/**
 * Get a specific conversation
 */
export async function getConversation(id: string, userId?: string): Promise<Conversation> {
  let url = `${API_BASE}/api/conversations/${id}`;
  if (userId) {
    url += `?userId=${encodeURIComponent(userId)}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch conversation");
  }
  return response.json();
}

/**
 * Archive or unarchive a conversation
 */
export async function archiveConversation(id: string, archived: boolean = true, userId?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/conversations/${id}/archive`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived, userId }),
  });
  if (!response.ok) {
    throw new Error("Failed to archive conversation");
  }
}

/**
 * Delete a conversation permanently
 */
export async function deleteConversation(id: string, userId?: string): Promise<void> {
  let url = `${API_BASE}/api/conversations/${id}`;
  if (userId) {
    url += `?userId=${encodeURIComponent(userId)}`;
  }
  const response = await fetch(url, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete conversation");
  }
}

/**
 * User model configuration for custom council
 */
export interface UserModelConfig {
  chairmanModel: string;
  councilModels: string[];
}

/**
 * Send a message and get the council response (non-streaming)
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  userConfig?: UserModelConfig
): Promise<CouncilResponse> {
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}/message`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, userConfig }),
    }
  );
  if (!response.ok) {
    throw new Error("Failed to send message");
  }
  return response.json();
}

/**
 * Send a message and stream the council response
 */
export async function sendMessageStream(
  conversationId: string,
  content: string,
  onEvent: (event: StreamEvent) => void,
  userConfig?: UserModelConfig
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}/message/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, userConfig }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event: StreamEvent = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
          console.error("Failed to parse SSE event:", line);
        }
      }
    }
  }
}
