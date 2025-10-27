import { tool } from 'ai';
import { Expense } from '../agent/types';
import { isBetween } from '../utils/date-helpers';
import { groupBy } from '../utils/array-helpers';
import { sum } from '../utils/math-helpers';

// JSON Schema directly for Gemini compatibility
const groupByCategoryJsonSchema = {
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
    topN: {
      type: 'number',
      description: 'Return only top N categories by spending (optional)'
    },
    sortBy: {
      type: 'string',
      enum: ['total', 'count', 'category'],
      description: 'Sort results by total spending, count, or category name',
      default: 'total'
    }
  }
};

export const createGroupByCategoryJsonTool = (expenses: Expense[]) => {
  return tool({
    description: `Group expenses by category and calculate totals for each category.
Useful for getting spending breakdowns and comparing category spending.
Returns aggregated category totals, not individual expenses.`,
    parameters: groupByCategoryJsonSchema as any,
    execute: async (params: any) => {
      console.log('[groupByCategory] Tool called with params:', params);
      const { startDate, endDate, topN, sortBy = 'total' } = params;
      let filtered = expenses;

      // Filter by date range
      if (startDate || endDate) {
        filtered = filtered.filter(exp => isBetween(exp.date, startDate, endDate));
      }

      // Group by category
      const grouped = groupBy(filtered, (exp) => exp.category || 'Uncategorized');

      // Calculate totals for each category
      const categoryTotals = Object.entries(grouped).map(([category, exps]) => ({
        category,
        total: Math.round(sum(exps.map(e => e.amount)) * 100) / 100,
        count: exps.length,
        average: Math.round((sum(exps.map(e => e.amount)) / exps.length) * 100) / 100,
      }));

      // Sort based on sortBy parameter
      let sorted = categoryTotals;
      if (sortBy === 'total') {
        sorted = categoryTotals.sort((a, b) => b.total - a.total);
      } else if (sortBy === 'count') {
        sorted = categoryTotals.sort((a, b) => b.count - a.count);
      } else if (sortBy === 'category') {
        sorted = categoryTotals.sort((a, b) => a.category.localeCompare(b.category));
      }

      // Limit to top N if specified
      if (topN && topN > 0) {
        sorted = sorted.slice(0, topN);
      }

      return {
        categories: sorted,
        totalCategories: categoryTotals.length,
        dateRange: { startDate, endDate },
      };
    },
  });
};