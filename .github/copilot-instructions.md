# GitHub Copilot Instructions for parLLMent

## Project Overview

This is **ParLLMent**, a 3-stage deliberation system where multiple LLMs collaboratively answer user questions through anonymized peer review.

## Tech Stack

- **Full Stack**: Next.js 16 with TypeScript API routes
- **Frontend**: Shadcn Studio, Motion-dev, Tailwind CSS
- **API**: OpenRouter for LLM access
- **Storage**: Vercel Postgres
- **Deployment**: Vercel

## Code Style & Conventions

### TypeScript (API Routes)

- Use Next.js App Router API routes in `app/api/`
- Use `async/await` for all API calls and I/O operations
- Use `Promise.all()` for parallel operations
- Follow graceful degradation: return `null` on failure, continue with successful responses
- Never fail entire requests due to single model failure

### TypeScript/React (Frontend)

- Use functional components with hooks
- Wrap all ReactMarkdown output in `<div className="markdown-content">`
- Use Tailwind CSS for styling
- Primary color: `#4a90e2` (blue), light mode theme
- Stage 3 uses green-tinted background: `#f0fff0`

### MCP Tools for Frontend Development

**Components & UI (Shadcn Studio)**
- Use `mcp_shadcn-studio_collect_selected_blocks` to select and collect UI blocks for installation
- Use `mcp_shadcn_get_add_command_for_items` to generate CLI commands for adding components
- Leverage these tools for components, grids, layouts, and UI mastery

**Animations (Motion.dev)**
- Use `mcp_motion-dev_convert_between_frameworks` for UI motion and animations
- Convert animation code between React, JavaScript, and Vue as needed
- Use Motion.dev tools for scroll animations, gestures, and layout animations

**Documentation (Context7)**
- Use `mcp_upstash_conte_resolve-library-id` to find library IDs for documentation lookup
- Use `mcp_upstash_conte_get-library-docs` to fetch up-to-date API documentation
- Always query Context7 when working with external libraries to ensure current API usage

## Architecture Rules

### Project Structure

```
frontend/
├── app/
│   ├── api/                    # Next.js API routes
│   │   ├── route.ts            # Health check
│   │   ├── scores/route.ts     # Leaderboard scores
│   │   └── conversations/
│   │       ├── route.ts        # List/Create conversations
│   │       └── [id]/
│   │           ├── route.ts    # Get/Delete conversation
│   │           ├── archive/route.ts
│   │           └── message/
│   │               ├── route.ts      # Non-streaming
│   │               └── stream/route.ts # SSE streaming
│   ├── page.tsx                # Main chat page
│   ├── scores/page.tsx         # Leaderboard page
│   └── layout.tsx
├── components/                 # React components
├── lib/
│   ├── config.ts              # COUNCIL_MODELS, CHAIRMAN_MODEL
│   ├── openrouter.ts          # queryModel(), queryModelsParallel()
│   ├── council.ts             # stage1/2/3 functions, ranking parsing
│   ├── storage.ts             # Postgres persistence
│   ├── api.ts                 # Frontend API client
│   ├── types.ts               # TypeScript types
│   └── utils.ts
└── package.json
```

## Critical Implementation Details

### Running the App

From the `frontend` directory:
```bash
npm run dev
```
The app runs on port 3000 by default.

### Environment Variables

Required in `.env.local` (local) or Vercel dashboard (production):
- `OPENROUTER_API_KEY` - OpenRouter API key
- `POSTGRES_URL` - Vercel Postgres connection string

### Stage 2 Ranking Format

When modifying Stage 2 prompts, maintain this strict format:
1. Evaluate each response individually
2. Include `FINAL RANKING:` header
3. Use numbered list: `1. Response C`, `2. Response A`, etc.
4. No additional text after ranking section

### De-anonymization

- Models receive anonymous labels: "Response A", "Response B", etc.
- API creates `label_to_model` mapping
- Frontend displays de-anonymized names in **bold** for readability
- De-anonymization happens client-side only

### Metadata Handling

- Metadata (`label_to_model`, `aggregate_rankings`) is **ephemeral**
- NOT persisted to storage, only returned via API response
- Frontend stores in UI state for display

## Common Patterns

### Adding a New Council Model

Edit `frontend/lib/config.ts`:
```typescript
export const COUNCIL_MODELS = [
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
  // Add new model here
];
```

### API Error Handling

```typescript
// API route pattern
const result = await queryModel(...);
if (result === null) {
  // Log but continue with other responses
  continue;
}
```

## Do NOT

- Use dark mode styling (project uses light mode)
- Persist metadata to database storage
- Fail entire requests when single models fail
- Add text after the FINAL RANKING section in Stage 2 prompts
