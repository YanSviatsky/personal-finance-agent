import { tool } from 'ai';
import { Expense } from '../agent/types';
import { isBetween } from '../utils/date-helpers';

// JSON Schema directly for Gemini compatibility
const queryExpensesJsonSchema = {
  type: 'object',
  properties: {
    startDate: {
      type: 'string',
      description: 'Start date in YYYY-MM-DD format (inclusive)'
    },
    endDate: {
      type: 'string',
      description: 'End date in YYYY-MM-DD format (inclusive)'
    },
    category: {
      type: 'string',
      description: 'Filter by category (e.g., Groceries, Dining, Entertainment)'
    },
    minAmount: {
      type: 'number',
      description: 'Minimum amount threshold'
    },
    maxAmount: {
      type: 'number',
      description: 'Maximum amount threshold'
    },
    vendor: {
      type: 'string',
      description: 'Filter by vendor name'
    }
  }
};

export const createQueryExpensesJsonTool = (expenses: Expense[]) => {
  return tool({
    description: `Query and filter expenses based on criteria. Returns filtered expense data.
Use this to find expenses matching specific conditions like date ranges, categories, amount thresholds, or vendors.`,
    parameters: queryExpensesJsonSchema as any,
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
  });
};