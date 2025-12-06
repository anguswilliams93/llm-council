/**
 * Conversations list endpoint
 * GET /api/conversations - List all conversations
 * POST /api/conversations - Create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listConversations,
  createConversation,
} from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get("include_archived") === "true";

    const conversations = await listConversations(includeArchived);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error listing conversations:", error);
    return NextResponse.json(
      { error: "Failed to list conversations" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const conversation = await createConversation();
    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
