import { z } from 'zod';
import { zodToJsonSchema } from 'openai-zod-to-json-schema';
import { Expense } from '../agent/types';
import { isBetween } from '../utils/date-helpers';

const queryExpensesSchema = z.object({
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (inclusive)'),
  endDate: z.string().optional().describe('End date in YYYY-MM-DD format (inclusive)'),
  category: z.string().optional().describe('Filter by category (e.g., Groceries, Dining, Entertainment)'),
  minAmount: z.number().optional().describe('Minimum amount threshold'),
  maxAmount: z.number().optional().describe('Maximum amount threshold'),
  vendor: z.string().optional().describe('Filter by vendor name'),
}).strict();

// Convert Zod schema to OpenAI-compatible JSON Schema
const queryExpensesJsonSchema = zodToJsonSchema(queryExpensesSchema);

export const createQueryExpensesTool = (expenses: Expense[]) => {
  // Return a plain object with the execute function
  return {
    description: `Query and filter expenses based on criteria. Returns filtered expense data.
Use this to find expenses matching specific conditions like date ranges, categories, amount thresholds, or vendors.`,
    parameters: queryExpensesJsonSchema,
    execute: async (params: any) => {
      console.log('[queryExpenses] Tool called with params:', params);
      const { startDate, endDate, category, minAmount, maxAmount, vendor } = params;
      let filtered = expenses;

      // Filter by date range
      if (startDate || endDate) {
        filtered = filtered.filter(exp => isBetween(exp.date, startDate, endDate));
      }

      // Filter by category
      if (category) {
        filtered = filtered.filter(exp =>
          exp.category?.toLowerCase() === category.toLowerCase()
        );
      }

      // Filter by amount range
      if (minAmount !== undefined) {
        filtered = filtered.filter(exp => exp.amount >= minAmount);
      }
      if (maxAmount !== undefined) {
        filtered = filtered.filter(exp => exp.amount <= maxAmount);
      }

      // Filter by vendor
      if (vendor) {
        filtered = filtered.filter(exp =>
          exp.vendor.toLowerCase().includes(vendor.toLowerCase())
        );
      }

      // Return summary to avoid bloating context
      return {
        count: filtered.length,
        expenses: filtered.map(exp => ({
          date: exp.date,
          amount: exp.amount,
          category: exp.category,
          vendor: exp.vendor
        }))
      };
    },
  };
};
