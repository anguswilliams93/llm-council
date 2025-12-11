import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUserModels, updateUserProfile } from "@/lib/auth";

// GET /api/auth/user?id=xxx - Get user by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}

// PUT /api/auth/user - Update user profile or models
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, email, chairmanModel, councilModels } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    let user;

    // If model updates are provided
    if (chairmanModel !== undefined || councilModels !== undefined) {
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

      user = await updateUserModels(userId, chairmanModel, councilModels);
    }

    // If profile updates are provided
    if (username !== undefined && email !== undefined) {
      user = await updateUserProfile(userId, username, email);
    }

    if (!user) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 }
      );
    }

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
    console.error("Update user error:", error);
    const message = error instanceof Error ? error.message : "Update failed";

    if (message.includes("already")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
