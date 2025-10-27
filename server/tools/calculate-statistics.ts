import { z } from 'zod';
import { zodToJsonSchema } from 'openai-zod-to-json-schema';
import { Expense } from '../agent/types';
import { isBetween } from '../utils/date-helpers';
import { sum, mean, median } from '../utils/math-helpers';
import { detectAnomalies } from '../utils/anomaly-helper';

const calculateStatisticsSchema = z.object({
  statistic: z.enum(['sum', 'average', 'median', 'count']).describe('The statistic to calculate'),
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (inclusive)'),
  endDate: z.string().optional().describe('End date in YYYY-MM-DD format (inclusive)'),
  category: z.string().optional().describe('Filter by category (e.g., Groceries, Dining, Entertainment)'),
  minAmount: z.number().optional().describe('Minimum amount threshold'),
  maxAmount: z.number().optional().describe('Maximum amount threshold'),
  excludeOutliers: z.boolean().optional().describe('Whether to exclude statistical outliers'),
  outlierThreshold: z.number().optional().describe('Z-score threshold for outlier detection'),
}).strict();

// Convert Zod schema to OpenAI-compatible JSON Schema
const calculateStatisticsJsonSchema = zodToJsonSchema(calculateStatisticsSchema);

export const createCalculateStatisticsTool = (expenses: Expense[]) => {
  return {
    description: `Calculate statistical aggregates (sum, average, median) for expenses.
Can filter by date range, category, and amount thresholds.
Can exclude outliers using anomaly detection.
Returns ONLY aggregated numbers, never raw expense lists.`,
    parameters: calculateStatisticsJsonSchema,
    execute: async (params: any) => {
      // Manually validate and provide defaults since Gemini might not send all params
      const parsedParams = calculateStatisticsSchema.safeParse(params);

      if (!parsedParams.success) {
        console.error('[calculateStatistics] Invalid parameters:', params);
        console.error('[calculateStatistics] Validation errors:', parsedParams.error);
        // Provide defaults for missing required params
        params = {
          statistic: params.statistic || 'sum',
          ...params
        };
      }
      console.log('[calculateStatistics] Tool called with params:', params);

      const {
        statistic,
        startDate,
        endDate,
        category,
        minAmount,
        maxAmount,
        excludeOutliers = false,
        outlierThreshold = 2,
      } = params;
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

      // Exclude outliers if requested
      if (excludeOutliers && filtered.length > 0) {
        const outliers = detectAnomalies(filtered, outlierThreshold);
        // Remove outliers by filtering out those with amounts matching outlier amounts
        // This is a simple approach - for exact matching we'd need to track indices
        const outliersSet = new Set(outliers.map(o => `${o.date}-${o.amount}-${o.vendor}`));
        filtered = filtered.filter(exp =>
          !outliersSet.has(`${exp.date}-${exp.amount}-${exp.vendor}`)
        );
      }

      const amounts = filtered.map(exp => exp.amount);

      let result = 0;
      switch (statistic) {
        case 'sum':
          result = sum(amounts);
          break;
        case 'average':
          result = mean(amounts);
          break;
        case 'median':
          result = median(amounts);
          break;
        case 'count':
          result = amounts.length;
          break;
      }

      return {
        statistic,
        value: Math.round(result * 100) / 100, // Round to 2 decimal places
        count: amounts.length,
        filters: {
          startDate,
          endDate,
          category,
          minAmount,
          maxAmount,
          excludeOutliers,
        },
      };
    },
  };
};
