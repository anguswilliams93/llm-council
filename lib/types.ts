/**
 * Type definitions for the parLLMent application
 */

export interface ConversationMetadata {
  id: string;
  created_at: string;
  title: string;
  message_count: number;
  archived?: boolean;
}

export interface Stage1Result {
  model: string;
  response: string;
}

export interface Stage2Result {
  model: string;
  ranking: string;
  parsed_ranking: string[];
}

export interface Stage3Result {
  model: string;
  response: string;
}

export interface UserMessage {
  role: "user";
  content: string;
  timestamp: string;
}

export interface AssistantMessage {
  role: "assistant";
  stage1?: Stage1Result[];
  stage2?: Stage2Result[];
  stage3?: Stage3Result;
  timestamp: string;
}

export type Message = UserMessage | AssistantMessage;

export interface Conversation {
  id: string;
  created_at: string;
  title: string;
  messages: Message[];
}

export interface CouncilMetadata {
  label_to_model: Record<string, string>;
  aggregate_rankings: Array<{
    model: string;
    average_rank: number;
    rankings_count: number;
    total_points?: number;
  }>;
}

export type StageStatus = "idle" | "loading" | "complete" | "error";
