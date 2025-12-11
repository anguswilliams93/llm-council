/**
 * Archive conversation endpoint
 * PATCH /api/conversations/[id]/archive - Archive/unarchive a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { archiveConversation } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const archived = body.archived ?? true;
    const userId = body.userId || undefined;

    // Pass userId for row-level security - archiveConversation returns success status
    const success = await archiveConversation(id, archived, userId);

    if (!success) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", archived });
  } catch (error) {
    console.error("Error archiving conversation:", error);
    return NextResponse.json(
      { error: "Failed to archive conversation" },
      { status: 500 }
    );
  }
}
