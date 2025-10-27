import { tool } from 'ai';
import { Expense } from '../agent/types';
import { isBetween } from '../utils/date-helpers';
import { sum, mean, median } from '../utils/math-helpers';
import { detectAnomalies } from '../utils/anomaly-helper';

// JSON Schema directly for Gemini compatibility
const calculateStatisticsJsonSchema = {
  type: 'object',
  properties: {
    statistic: {
      type: 'string',
      enum: ['sum', 'average', 'median', 'count'],
      description: 'The statistic to calculate'
    },
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
    excludeOutliers: {
      type: 'boolean',
      description: 'Whether to exclude statistical outliers',
      default: false
    },
    outlierThreshold: {
      type: 'number',
      description: 'Z-score threshold for outlier detection',
      default: 2
    }
  },
  required: ['statistic']
};

export const createCalculateStatisticsJsonTool = (expenses: Expense[]) => {
  return tool({
    description: `Calculate statistical aggregates (sum, average, median) for expenses.
Can filter by date range, category, and amount thresholds.
Can exclude outliers using anomaly detection.
Returns ONLY aggregated numbers, never raw expense lists.`,
    parameters: calculateStatisticsJsonSchema as any,
    execute: async (params: any) => {
      console.log('[calculateStatistics] Tool called with params:', params);

      const {
        statistic = 'sum',
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
        value: Math.round(result * 100) / 100,
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
  });
};