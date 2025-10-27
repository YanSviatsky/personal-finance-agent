import { generateText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Expense } from './types';
import { createTools } from '../tools';

export class FinanceAgent {
  private expenses: Expense[];
  private conversationHistory: CoreMessage[] = [];

  constructor(expenses: Expense[]) {
    this.expenses = expenses;
  }

  async run(query: string): Promise<string> {
    console.log('[Agent] Processing query:', query);

    // Add user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: query,
    });

    // Create tools with access to expenses
    const tools = createTools(this.expenses);
    console.log('[Agent] Tools created:', Object.keys(tools));

    // System prompt for Anthropic Claude
    const systemPrompt = `You are a helpful financial assistant that analyzes personal expense data.

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

Always use tools to get accurate data. Never make up numbers.`;

    try {
      console.log('[Agent] Calling generateText with tools...');

      // Call with explicit tool usage
      const result = await generateText({
        model: openai('gpt-4-turbo'), // or 'gpt-3.5-turbo' for cheaper option
        system: systemPrompt,
        messages: this.conversationHistory,
        tools,
        maxSteps: 10, // Allow multiple steps for tool calls
      });

      console.log('[Agent] Result received:', {
        text: result.text,
        finishReason: result.finishReason,
        usage: result.usage,
        stepsCount: result.steps?.length,
      });

      // Log detailed step information
      if (result.steps) {
        result.steps.forEach((step, index) => {
          console.log(`[Agent] Step ${index + 1}:`, JSON.stringify(step, null, 2));
        });
      }

      // Check if we got a text response
      if (!result.text) {
        console.error('[Agent] No text response generated');
        return 'I encountered an issue processing your request. Please try again.';
      }

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: result.text,
      });

      return result.text;
    } catch (error) {
      console.error('[Agent] Error in agent run:', error);
      console.error('[Agent] Error details:', JSON.stringify(error, null, 2));

      // Provide more specific error message
      if (error instanceof Error) {
        return `Error: ${error.message}. Please try rephrasing your question.`;
      }

      throw error;
    }
  }
}
