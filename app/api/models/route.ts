import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

/**
 * Sync models from OpenRouter to database
 * - Adds new models
 * - Updates existing models
 * - Marks removed models as inactive
 */
async function syncModelsToDatabase(openRouterModels: OpenRouterModel[]) {
  const openRouterModelIds = new Set(openRouterModels.map(m => m.id));

  // Get all existing models from database
  const existingModels = await prisma.lLMModel.findMany();
  const existingModelIds = new Set(existingModels.map(m => m.id));

  // Prepare upsert operations for all OpenRouter models
  const upsertPromises = openRouterModels.map(model =>
    prisma.lLMModel.upsert({
      where: { id: model.id },
      create: {
        id: model.id,
        name: model.name,
        description: model.description || null,
        context_length: model.context_length || null,
        pricing_prompt: model.pricing?.prompt || null,
        pricing_completion: model.pricing?.completion || null,
        is_active: true,
      },
      update: {
        name: model.name,
        description: model.description || null,
        context_length: model.context_length || null,
        pricing_prompt: model.pricing?.prompt || null,
        pricing_completion: model.pricing?.completion || null,
        is_active: true, // Re-activate if it was previously marked inactive
      },
    })
  );

  // Mark models that no longer exist on OpenRouter as inactive
  const modelsToDeactivate = existingModels
    .filter(m => !openRouterModelIds.has(m.id) && m.is_active)
    .map(m => m.id);

  const deactivatePromise = modelsToDeactivate.length > 0
    ? prisma.lLMModel.updateMany({
        where: { id: { in: modelsToDeactivate } },
        data: { is_active: false },
      })
    : Promise.resolve();

  // Execute all operations
  await Promise.all([...upsertPromises, deactivatePromise]);

  return {
    added: openRouterModels.filter(m => !existingModelIds.has(m.id)).length,
    updated: openRouterModels.filter(m => existingModelIds.has(m.id)).length,
    deactivated: modelsToDeactivate.length,
  };
}

export async function GET() {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(`${OPENROUTER_API_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If OpenRouter API fails, fall back to database cache
      console.warn("OpenRouter API failed, using cached models");
      const cachedModels = await prisma.lLMModel.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        models: cachedModels.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description || "",
          context_length: m.context_length,
          pricing: {
            prompt: m.pricing_prompt,
            completion: m.pricing_completion,
          },
        })),
        total: cachedModels.length,
        cached: true,
      });
    }

    const data = await response.json();

    // Filter and format models
    const models: OpenRouterModel[] = data.data
      ?.map((model: OpenRouterModel) => ({
        id: model.id,
        name: model.name,
        description: model.description || "",
        context_length: model.context_length,
        pricing: model.pricing,
      }))
      .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name)) || [];

    // Sync to database (non-blocking - don't wait for it to complete)
    syncModelsToDatabase(models).then(stats => {
      console.log(`Models sync: ${stats.added} added, ${stats.updated} updated, ${stats.deactivated} deactivated`);
    }).catch(err => {
      console.error("Failed to sync models to database:", err);
    });

    return NextResponse.json({ models, total: models.length });
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);

    // Try to return cached models on error
    try {
      const cachedModels = await prisma.lLMModel.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
      });

      if (cachedModels.length > 0) {
        return NextResponse.json({
          models: cachedModels.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description || "",
            context_length: m.context_length,
            pricing: {
              prompt: m.pricing_prompt,
              completion: m.pricing_completion,
            },
          })),
          total: cachedModels.length,
          cached: true,
        });
      }
    } catch {
      // Database also failed
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
