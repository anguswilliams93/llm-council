/**
 * Archive conversation endpoint
 * PATCH /api/conversations/[id]/archive - Archive/unarchive a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { getConversation, archiveConversation } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const archived = body.archived ?? true;

    const conversation = await getConversation(id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await archiveConversation(id, archived);
    return NextResponse.json({ status: "ok", archived });
  } catch (error) {
    console.error("Error archiving conversation:", error);
    return NextResponse.json(
      { error: "Failed to archive conversation" },
      { status: 500 }
    );
  }
}
