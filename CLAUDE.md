# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **conversational AI finance agent** that analyzes personal expense data through natural language dialogue. The agent maintains conversational memory and can handle follow-up questions without requiring users to repeat context.

**Example flow:**
- User: "How much did I spend on groceries last month?"
- Agent: "You spent $253.19 on groceries in September 2024."
- User: "What about the month before?"
- Agent: "In August, you spent $198.45 on groceries."
- User: "So I spent more in September?"
- Agent: "Yes, you spent $54.74 more in September compared to August."

## Workspace Structure

This is a monorepo with two workspaces:
- **`public/`** - React frontend (Vite + TypeScript + Mantine UI)
- **`server/`** - Express backend with AI agent (TypeScript + Google AI SDK)

## Development Commands

### Initial Setup
```bash
# Install dependencies in root AND server directory
npm i
cd server && npm i && cd ..

# Configure environment
# Create server/.env with: GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
# Get API key from: https://aistudio.google.com/app/apikey
```

**Important:** The env var MUST be `GOOGLE_GENERATIVE_AI_API_KEY` (not `GEMINI_API_KEY`) per AI SDK requirements.

### Running the Application
```bash
# Development (runs both frontend and backend with HMR)
npm run dev
# Frontend: http://localhost:5173/
# Backend: http://localhost:3000/

# Production build
npm run build

# Start production server
npm start
```

### Workspace-specific Commands
```bash
# Frontend only
npm run dev -w public
npm run build -w public
npm run lint -w public

# Backend only
npm run dev -w server    # Uses tsx watch
npm run build -w server  # TypeScript compilation
npm run start -w server  # Runs compiled JS
```

## Architecture

### Agent System (`server/agent/`)

The core is `FinanceAgent` in `server/agent/index.ts`. This is a **stateful singleton** agent:
- One instance created at server startup and persists across requests
- Maintains conversation history/memory across multiple user queries
- Uses Google AI SDK's `generateText` with tool calling capabilities
- Entry point: `async run(query: string): Promise<string>`

**Critical Memory Management Rule:**
- **DO NOT** store the entire expenses dataset in the agent's conversation memory
- **DO NOT** return full expense arrays from tool calls to the LLM context
- Only return aggregated results (sums, averages, counts) or small filtered lists
- Rationale: Prevents context bloat, token waste, and model confusion

### Tools Pattern (`server/tools/`)

The `server/tools/` directory is where you define tool functions for the agent. Tools enable the LLM to perform specific analyses on expense data. Example tool capabilities needed:
- Filter expenses by date ranges, categories, amounts
- Calculate aggregates (sum, average, median) for expense groups
- Detect and exclude outliers using `anomaly-helper.ts`
- Compare spending across time periods or categories
- Group and analyze by category

Tools should be defined as Zod schemas and registered with the AI SDK's tool calling system.

### Data Layer

**Expense Data:**
- Located at: `server/expenses_data/expenses_2024-2025.csv`
- Loaded at startup via `csv-loader.ts`
- Schema: `{date: string, amount: number, category: string | null, vendor: string}`

**Helpers Available:**
- `server/utils/anomaly-helper.ts` - Statistical outlier detection using z-score method
- `server/utils/date-helpers.ts` - Date parsing and range filtering
- `server/utils/math-helpers.ts` - sum, mean, median, standardDeviation, min, max
- `server/utils/array-helpers.ts` - groupBy for categorization
- `server/utils/general.ts` - deepDelete (useful for cleaning LLM response objects)

### Request Flow

```
Frontend (App.tsx)
  → POST /api/ask_finance_assistant
    → financeAssistantController.ts
      → financeAssistantService.ts
        → agent.run(question)
          → [LLM with tool calling]
        → convertMDtoHTML (showdown)
      → Returns HTML response
```

The frontend accepts both plain strings and **Markdown-formatted text** from the agent. The service layer converts Markdown to HTML using Showdown before returning.

### Frontend (`public/src/`)

**No UI changes needed.** The frontend is fully implemented:
- `App.tsx` - Main container with dark mode, chat state, GUIDING_QUESTIONS
- `ChatContainer.tsx` - Message display (renders HTML from backend)
- `FinanceInput.tsx` - User input field
- `GuidingQuestions.tsx` - Clickable example questions
- `ChatBubble.tsx` - Individual message bubbles

The GUIDING_QUESTIONS in `App.tsx:8-22` define the target capabilities the agent should support.

## Testing Your Implementation

### Validation Answers
When testing, tell the LLM "today is December 30th, 2025" for consistent relative date handling.

Expected results:
- Groceries last month: **$288.75**
- Average dining expense (all time): **$161.16**
- Spending by category last month:
  - Groceries: $288.75
  - Utilities: $148.90
  - Entertainment: $79.41
  - Dining: $72.69
  - Transportation: $34.94
  - Subscriptions: $27.03
- Median dining expense, excluding outliers (all time): **$81.16**
- Median groceries > $50 vs last month: **$60.70 vs $91.41**

## Key Implementation Notes

1. **Agent Statefulness:** The agent instance is created once in `financeAssistantService.ts:9` and reused. Design tool calls to support follow-up questions that reference prior context.

2. **Outlier Detection:** Use `detectAnomalies(expenses, thresholdMultiplier)` from `anomaly-helper.ts`. This implements a basic z-score approach (mean + threshold × stdDev).

3. **Tool Call Results:** Be selective about what you return from tools to the LLM. Return summaries, not raw data dumps.

4. **Date Handling:** The system should support:
   - Absolute dates: "September 2024", "August 1st"
   - Relative dates: "last month", "this month" (requires system date context)

5. **Response Format:** Agent can return markdown. The service layer converts it to HTML. Use markdown formatting for structured responses (lists, tables, bold).

## Hints and Resources

The README references external hints for implementation guidance:
- [Hint 0](https://gist.githubusercontent.com/JonaCodes/10e112c6daa80173cf99480ff56fa7e2/raw/5fa08adefd24b18125c74a7b9fe3013145098734/hint-0.txt)
- [Hint 1](https://gist.githubusercontent.com/JonaCodes/10e112c6daa80173cf99480ff56fa7e2/raw/5fa08adefd24b18125c74a7b9fe3013145098734/hint-1.txt)
- [Hint 2](https://gist.github.com/JonaCodes/10e112c6daa80173cf99480ff56fa7e2#file-hint-2-md)

# Tools & Documentation Policy

## When to use Context7
Always call **Context7** to fetch up-to-date docs/snippets when ANY of the following are true:
- I mention a library/framework/package by name (e.g., Next.js, React, Tailwind, Prisma).
- You’re writing code that depends on public APIs/SDKs, CLI flags, config files, or plugin options.
- You see a compile/runtime error that references a third-party package.
- You’re unsure of an option name, function signature, or version-specific behavior.

## How to use Context7
- Resolve the library: `resolve-library-id` using the library name(s) inferred from my request.
- Fetch the most relevant docs/examples: `get-library-docs` for the needed topic (APIs, configuration, errors, “how to”).
- Prefer **stable** or latest **minor** documentation, and surface version if relevant.
- Quote or summarize the exact option names and signatures from the docs you retrieved.
- If multiple libraries are plausible, ask for clarification **only if** ambiguity blocks action; otherwise pick the best match and proceed.

## Output Requirements
- Show the code answer first, then a short “Docs used via Context7” section listing the pages/topics pulled.
- If Context7 returns nothing useful, say so and continue with best-effort reasoning from local context.

## Examples
- “Add Prisma soft deletes” → Resolve `Prisma` and fetch `model annotations` / `middleware` docs.
- “Deploy to Vercel with Next 15 app dir” → Resolve `Next.js`, fetch `app router` + `Vercel deploy` docs.
- “tsconfig moduleResolution bundler?” → Resolve `TypeScript`, fetch `tsconfig` docs for `moduleResolution`.


# Tool Version Policy

Always use the **latest stable** version of connected tools and libraries.
- When resolving docs via Context7, prefer the newest stable release unless I specify otherwise.
- When fetching SDK or API references, prefer the most recent major version (e.g., v5 if available).
- If a version is ambiguous, check Context7 or npm for the newest stable tag.
- If a tool is outdated, notify me and suggest running:
  `npx -y @smithery/cli upgrade --client claude`
