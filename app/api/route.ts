/**
 * Health check endpoint
 * GET /api
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "LLM Council API" });
}
