/**
 * Message endpoint (non-streaming)
 * POST /api/conversations/[id]/message - Send a message and get council response
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getConversation,
  addUserMessage,
  addAssistantMessage,
  updateConversationTitle,
} from "@/lib/storage";
import { runFullCouncil, generateConversationTitle } from "@/lib/council";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const content = body.content;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    const conversation = await getConversation(id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if this is the first message
    const isFirstMessage = conversation.messages.length === 0;

    // Add user message
    await addUserMessage(id, content);

    // Generate title if first message (run in parallel with council)
    const titlePromise = isFirstMessage
      ? generateConversationTitle(content)
      : Promise.resolve(null);

    // Run the 3-stage council process
    const { stage1, stage2, stage3, metadata } = await runFullCouncil(content);

    // Wait for title generation if it was started
    const title = await titlePromise;
    if (title) {
      await updateConversationTitle(id, title);
    }

    // Add assistant message with all stages
    await addAssistantMessage(id, stage1, stage2, stage3);

    // Return the complete response with metadata
    return NextResponse.json({
      stage1,
      stage2,
      stage3,
      metadata,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
