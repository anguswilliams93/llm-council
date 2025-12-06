/**
 * Scores endpoint
 * GET /api/scores - Get overall scores across all conversations
 */

import { NextResponse } from "next/server";
import { getOverallScores } from "@/lib/storage";

export async function GET() {
  try {
    const scores = await getOverallScores();
    return NextResponse.json(scores);
  } catch (error) {
    console.error("Error getting scores:", error);
    return NextResponse.json(
      { error: "Failed to get scores" },
      { status: 500 }
    );
  }
}
