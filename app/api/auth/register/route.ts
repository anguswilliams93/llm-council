import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, chairmanModel, councilModels } = body;

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    if (!chairmanModel) {
      return NextResponse.json(
        { error: "Chairman model is required" },
        { status: 400 }
      );
    }

    if (!councilModels || !Array.isArray(councilModels) || councilModels.length === 0) {
      return NextResponse.json(
        { error: "At least one council model is required" },
        { status: 400 }
      );
    }

    if (councilModels.length > 4) {
      return NextResponse.json(
        { error: "Maximum 4 council models allowed" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const user = await registerUser({
      username,
      email,
      password,
      chairmanModel,
      councilModels,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        chairmanModel: user.chairmanModel,
        councilModels: user.councilModels,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    const message = error instanceof Error ? error.message : "Registration failed";

    // Check for common errors
    if (message.includes("already")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
