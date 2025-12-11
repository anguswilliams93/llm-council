/**
 * Conversations list endpoint
 * GET /api/conversations - List all conversations for a user
 * POST /api/conversations - Create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { listConversations, createConversation } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get("include_archived") === "true";
    const userId = searchParams.get("userId") || undefined;

    // Pass userId for row-level security filtering
    const conversations = await listConversations(includeArchived, userId);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error listing conversations:", error);
    return NextResponse.json(
      { error: "Failed to list conversations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || undefined;

    // Pass userId to associate conversation with user
    const conversation = await createConversation(undefined, userId);
    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
