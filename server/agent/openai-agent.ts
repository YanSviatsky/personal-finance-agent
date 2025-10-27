import OpenAI from 'openai';
import { Expense } from './types';
import { createQueryExpensesTool } from '../tools/query-expenses';
import { createCalculateStatisticsTool } from '../tools/calculate-statistics';
import { createGroupByCategoryTool } from '../tools/group-by-category';

export class OpenAIFinanceAgent {
  private expenses: Expense[];
  private openai: OpenAI;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private tools: Record<string, any>;

  constructor(expenses: Expense[]) {
    this.expenses = expenses;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create tools
    this.tools = {
      queryExpenses: createQueryExpensesTool(expenses),
      calculateStatistics: createCalculateStatisticsTool(expenses),
      groupByCategory: createGroupByCategoryTool(expenses),
    };
  }

  async run(query: string): Promise<string> {
    console.log('[OpenAI Agent] Processing query:', query);

    // Add user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: query,
    });

    // System prompt
    const systemPrompt: OpenAI.Chat.ChatCompletionMessageParam = {
      role: 'system',
      content: `You are a helpful financial assistant that analyzes personal expense data.

IMPORTANT CONTEXT:
- Today's date is December 30, 2025
- When users say "last month", they mean November 2025 (2025-11-01 to 2025-11-30)
- When users say "this month", they mean December 2025 (2025-12-01 to 2025-12-30)
- When users say "September" without a year, assume September 2024 (2024-09-01 to 2024-09-30)
- When users say "October" without a year, assume October 2025 (2025-10-01 to 2025-10-31)

You have access to these tools:
- calculateStatistics: Calculate sum, average, median, or count of expenses with optional filters
- groupByCategory: Get spending breakdown by category
- queryExpenses: Query and filter expense records

CONVERSATIONAL MEMORY:
- Remember previous queries and their context
- When users ask follow-up questions like "what about the month before?", refer to the previous category/criteria
- When users say "exclude outliers from both", remember the two time periods being compared

FORMATTING:
- Use markdown for formatting (bold, lists, tables)
- Round currency amounts to 2 decimal places
- Be concise and direct

Always use tools to get accurate data. Never make up numbers.`
    };

    try {
      console.log('[OpenAI Agent] Calling OpenAI API with tools...');

      // Create tool definitions for OpenAI
      const toolDefinitions: OpenAI.Chat.ChatCompletionTool[] = Object.entries(this.tools).map(([name, tool]) => ({
        type: 'function',
        function: {
          name,
          description: tool.description,
          parameters: tool.parameters,
        }
      }));

      console.log('[OpenAI Agent] Tool definitions:', JSON.stringify(toolDefinitions, null, 2));

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [systemPrompt, ...this.conversationHistory],
        tools: toolDefinitions,
        tool_choice: 'auto',
      });

      console.log('[OpenAI Agent] Received response from OpenAI');

      const responseMessage = completion.choices[0].message;

      // Handle tool calls if any
      if (responseMessage.tool_calls) {
        console.log('[OpenAI Agent] Processing tool calls:', responseMessage.tool_calls.length);

        // Add assistant's message to history
        this.conversationHistory.push(responseMessage);

        // Execute tool calls
        for (const toolCall of responseMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          console.log(`[OpenAI Agent] Executing tool: ${toolName} with args:`, toolArgs);

          if (this.tools[toolName]) {
            try {
              const result = await this.tools[toolName].execute(toolArgs);

              // Add tool result to conversation
              this.conversationHistory.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              });

              console.log(`[OpenAI Agent] Tool ${toolName} result:`, result);
            } catch (error) {
              console.error(`[OpenAI Agent] Error executing tool ${toolName}:`, error);

              // Add error to conversation
              this.conversationHistory.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: `Error executing tool: ${error}` }),
              });
            }
          }
        }

        // Get final response after tool execution
        console.log('[OpenAI Agent] Getting final response after tool execution...');
        const finalCompletion = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [systemPrompt, ...this.conversationHistory],
        });

        const finalMessage = finalCompletion.choices[0].message;

        // Add final response to history
        this.conversationHistory.push(finalMessage);

        return finalMessage.content || 'I apologize, but I could not generate a response.';
      }

      // No tool calls, return direct response
      this.conversationHistory.push(responseMessage);
      return responseMessage.content || 'I apologize, but I could not generate a response.';

    } catch (error) {
      console.error('[OpenAI Agent] Error:', error);

      if (error instanceof Error) {
        return `Error: ${error.message}. Please try rephrasing your question.`;
      }

      return 'An unexpected error occurred. Please try again.';
    }
  }
}