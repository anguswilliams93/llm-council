/**
 * Single conversation endpoint
 * GET /api/conversations/[id] - Get a conversation
 * DELETE /api/conversations/[id] - Delete a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { getConversation, deleteConversation } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || undefined;

    // Pass userId for row-level security
    const conversation = await getConversation(id, userId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error getting conversation:", error);
    return NextResponse.json(
      { error: "Failed to get conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || undefined;

    // Pass userId for row-level security - deleteConversation returns success status
    const deleted = await deleteConversation(id, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
