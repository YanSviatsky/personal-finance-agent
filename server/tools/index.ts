import { Expense } from '../agent/types';
// Using original Zod-based tools (Anthropic handles these correctly)
import { createQueryExpensesTool } from './query-expenses';
import { createCalculateStatisticsTool } from './calculate-statistics';
import { createGroupByCategoryTool } from './group-by-category';

export const createTools = (expenses: Expense[]) => {
  return {
    queryExpenses: createQueryExpensesTool(expenses),
    calculateStatistics: createCalculateStatisticsTool(expenses),
    groupByCategory: createGroupByCategoryTool(expenses),
  };
};
