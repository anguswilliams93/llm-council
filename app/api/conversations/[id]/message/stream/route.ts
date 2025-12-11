/**
 * Streaming message endpoint
 * POST /api/conversations/[id]/message/stream - Send a message and stream council response
 */

import { NextRequest } from "next/server";
import {
  getConversation,
  addUserMessage,
  addAssistantMessage,
  updateConversationTitle,
} from "@/lib/storage";
import {
  stage1CollectResponses,
  stage2CollectRankings,
  stage3SynthesizeFinal,
  calculateAggregateRankings,
  generateConversationTitle,
  buildConversationHistory,
  type UserModelConfig,
} from "@/lib/council";
import type { Stage1Result, Stage2Result, Stage3Result } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const content = body.content;

  // Optional user model configuration
  const userConfig: UserModelConfig | undefined = body.userConfig;

  if (!content || typeof content !== "string") {
    return new Response(JSON.stringify({ error: "Message content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversation = await getConversation(id);

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isFirstMessage = conversation.messages.length === 0;

  // Build conversation history from previous messages for context
  const conversationHistory = buildConversationHistory(conversation.messages);

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Add user message
        await addUserMessage(id, content);

        // Start title generation in parallel (don't await yet)
        let titlePromise: Promise<string> | null = null;
        if (isFirstMessage) {
          titlePromise = generateConversationTitle(content);
        }

        // Stage 1: Collect responses (with conversation history for context)
        sendEvent({ type: "stage1_start" });
        const stage1Results: Stage1Result[] = await stage1CollectResponses(
          content,
          userConfig,
          conversationHistory
        );
        sendEvent({ type: "stage1_complete", data: stage1Results });

        // Stage 2: Collect rankings (using user's council models if provided)
        sendEvent({ type: "stage2_start" });
        const { rankings: stage2Results, labelToModel } = await stage2CollectRankings(
          content,
          stage1Results,
          userConfig
        );
        const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);
        sendEvent({
          type: "stage2_complete",
          data: stage2Results,
          metadata: {
            label_to_model: labelToModel,
            aggregate_rankings: aggregateRankings,
          },
        });

        // Stage 3: Synthesize final answer (with conversation history for context)
        sendEvent({ type: "stage3_start" });
        const stage3Result: Stage3Result = await stage3SynthesizeFinal(
          content,
          stage1Results,
          stage2Results,
          userConfig,
          conversationHistory
        );
        sendEvent({ type: "stage3_complete", data: stage3Result });

        // Wait for title generation if it was started
        if (titlePromise) {
          const title = await titlePromise;
          await updateConversationTitle(id, title);
          sendEvent({ type: "title_complete", data: { title } });
        }

        // Save complete assistant message
        await addAssistantMessage(id, stage1Results, stage2Results as Stage2Result[], stage3Result);

        // Send completion event
        sendEvent({ type: "complete" });
      } catch (error) {
        // Send error event
        sendEvent({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
