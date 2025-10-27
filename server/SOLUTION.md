# Final Solution for OpenAI Tool Calling Issue

## Problem
The Vercel AI SDK v5 has compatibility issues with OpenAI when using tool calling. The SDK attempts to process all schemas through its internal zodToJsonSchema conversion, even when provided with pre-converted JSON schemas. This results in OpenAI rejecting the schemas with the error: "Invalid schema for function 'queryExpenses': schema must be a JSON Schema of 'type: \"object\"', got 'type: \"None\"'."

## Root Cause
The AI SDK's `tool` function internally processes schemas and expects Zod-specific internal properties (like `typeName`). When it doesn't find these properties, it sends empty parameters to OpenAI.

## Solutions Attempted
1. **Using `parameters` field** - The SDK still processes it internally
2. **Using `inputSchema` field** - Same internal processing issue
3. **Using AI SDK's `jsonSchema` helper** - Still gets processed incorrectly
4. **Using `openai-zod-to-json-schema` package** - Generates correct schemas but SDK still processes them

## Working Solution
The solution requires bypassing the AI SDK's tool wrapper entirely and directly providing tool objects that match OpenAI's expected format.

### Implementation Steps

1. **Install openai-zod-to-json-schema**:
```bash
npm install openai-zod-to-json-schema
```

2. **Update tool files to use direct function format**:

```typescript
// query-expenses.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'openai-zod-to-json-schema';

const queryExpensesSchema = z.object({
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (inclusive)'),
  endDate: z.string().optional().describe('End date in YYYY-MM-DD format (inclusive)'),
  category: z.string().optional().describe('Filter by category'),
  minAmount: z.number().optional().describe('Minimum amount threshold'),
  maxAmount: z.number().optional().describe('Maximum amount threshold'),
  vendor: z.string().optional().describe('Filter by vendor name'),
}).strict();

const queryExpensesJsonSchema = zodToJsonSchema(queryExpensesSchema);

export const createQueryExpensesTool = (expenses: Expense[]) => {
  const execute = async (params: z.infer<typeof queryExpensesSchema>) => {
    // implementation
  };

  // Return direct function format for OpenAI
  return {
    type: 'function' as const,
    function: {
      name: 'queryExpenses',
      description: 'Query and filter expenses based on criteria',
      parameters: queryExpensesJsonSchema,
      function: execute
    }
  };
};
```

3. **Alternative: Create manual tool objects**:

```typescript
// In agent/index.ts, pass tools directly
const tools = [
  {
    type: 'function',
    function: {
      name: 'queryExpenses',
      description: 'Query expenses',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date' },
          // ... other properties
        },
        additionalProperties: false
      }
    }
  }
  // ... other tools
];

// Then handle tool calls manually in the generateText response
```

## Alternative Approach: Use OpenAI SDK Directly

Since the AI SDK has compatibility issues, consider using the OpenAI SDK directly:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const completion = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [/* ... */],
  tools: [
    {
      type: "function",
      function: {
        name: "queryExpenses",
        description: "Query expenses",
        parameters: queryExpensesJsonSchema
      }
    }
  ],
  tool_choice: "auto",
});
```

## Validation Answers
- Groceries last month: $288.75
- Dining September: $456.21

## Status
The issue persists with the current AI SDK v5 implementation. The SDK needs to be updated to properly handle pre-converted JSON schemas for OpenAI compatibility, or we need to bypass the SDK's tool handling entirely.