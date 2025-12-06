# GitHub Copilot Instructions for parLLMent

## Project Overview

This is **ParLLMent**, a 3-stage deliberation system where multiple LLMs collaboratively answer user questions through anonymized peer review.

## Tech Stack

- **Backend**: Python 3, FastAPI, asyncio
- **Frontend**:  Next.JS 16, Shadcn Studio, Motion-dev.
- **API**: OpenRouter for LLM access
- **Storage**: JSON files in `data/conversations/`

## Code Style & Conventions

### Python (Backend)

- Use **relative imports** in all backend modules: `from .config import ...`
- Use `async/await` for all API calls and I/O operations
- Use `asyncio.gather()` for parallel operations
- Follow graceful degradation: return `None` on failure, continue with successful responses
- Never fail entire requests due to single model failure

### JavaScript/React (Frontend)

- Use functional components with hooks
- Wrap all ReactMarkdown output in `<div className="markdown-content">`
- Use CSS modules pattern (component-specific `.css` files)
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

### Backend Structure

```
backend/
├── config.py      # COUNCIL_MODELS, CHAIRMAN_MODEL, env vars
├── openrouter.py  # query_model(), query_models_parallel()
├── council.py     # stage1/2/3 functions, ranking parsing
├── storage.py     # JSON conversation persistence
└── main.py        # FastAPI app, CORS, endpoints
```

### Frontend Structure

```
frontend/src/
├── App.jsx              # Main orchestration
├── api.js               # Backend API calls
└── components/
    ├── ChatInterface.jsx  # Input textarea
    ├── Stage1.jsx         # Individual responses (tabs)
    ├── Stage2.jsx         # Rankings + de-anonymization
    └── Stage3.jsx         # Final synthesis
```

## Critical Implementation Details

### Running the Backend

Always run from project root:
```bash
python -m backend.main
```
Never run from the backend directory or use `python backend/main.py`.

### Port Configuration

- Backend: **8001** (not 8000)
- Frontend: **5173** (Vite default)
- If changing ports, update both `backend/main.py` and `frontend/src/api.js`

### Stage 2 Ranking Format

When modifying Stage 2 prompts, maintain this strict format:
1. Evaluate each response individually
2. Include `FINAL RANKING:` header
3. Use numbered list: `1. Response C`, `2. Response A`, etc.
4. No additional text after ranking section

### De-anonymization

- Models receive anonymous labels: "Response A", "Response B", etc.
- Backend creates `label_to_model` mapping
- Frontend displays de-anonymized names in **bold** for readability
- De-anonymization happens client-side only

### Metadata Handling

- Metadata (`label_to_model`, `aggregate_rankings`) is **ephemeral**
- NOT persisted to storage, only returned via API response
- Frontend stores in UI state for display

## Common Patterns

### Adding a New Council Model

Edit `backend/config.py`:
```python
COUNCIL_MODELS = [
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    # Add new model here
]
```

### Creating New Stage Components

1. Create `Stage{N}.jsx` and `Stage{N}.css` in `frontend/src/components/`
2. Wrap markdown content: `<div className="markdown-content">`
3. Import and add to `ChatInterface.jsx`

### API Error Handling

```python
# Backend pattern
result = await query_model(...)
if result is None:
    # Log but continue with other responses
    continue
```

## Testing

Use `test_openrouter.py` to verify API connectivity before adding new models.

## Do NOT

- Use absolute imports in backend modules
- Always stop the current servers before restarting.
- When starting the servers, run start.sh in bash terminal from the project root.
- Run backend directly with `python backend/main.py`
- Use dark mode styling (project uses light mode)
- Persist metadata to JSON storage
- Fail entire requests when single models fail
- Add text after the FINAL RANKING section in Stage 2 prompts
