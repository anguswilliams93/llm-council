# ParLLMent

ParLLMent is a local web application that harnesses the collective intelligence of multiple large language models to answer your questions. Rather than relying on a single AI provider, ParLLMent sends your query to a council of LLMs, facilitates anonymous peer review among them, and synthesizes a final consensus response.

## How It Works

ParLLMent operates through a three-stage deliberation process:

**Stage 1: Individual Responses**  
Your question is sent simultaneously to multiple LLMs (such as GPT-4, Claude, Gemini, and others via OpenRouter). Each model generates its own independent answer. You can view all individual responses in a tabbed interface to compare their perspectives.

**Stage 2: Peer Review**  
Each model receives the anonymized responses from all other models and ranks them based on accuracy and insight. This blind review process prevents models from showing bias toward or against specific providers. The aggregate rankings are displayed with a scoreboard showing which responses were most highly rated across all reviewers.

**Stage 3: Final Synthesis**  
A designated model takes all individual responses along with the peer review rankings and produces a unified final answer. This synthesis draws on the strongest elements from each response while resolving any contradictions.

## Benefits

- **Reduced hallucination risk**: Cross-validation between multiple models helps identify and filter out incorrect information
- **Broader knowledge coverage**: Different models have different training data and strengths, providing more comprehensive answers
- **Built-in quality assessment**: The peer review rankings give you insight into which responses the models themselves found most reliable
- **Transparency**: You can inspect every stage of the process, from individual responses to rankings to final synthesis
- **Model-agnostic**: Works with any models available through OpenRouter, making it easy to add or swap providers

## Tech Stack

- **Backend**: Python, FastAPI, asyncio
- **Frontend**: Next.js, React, Tailwind CSS, Shadcn UI
- **LLM Access**: OpenRouter API
