import { z } from 'zod';
import { zodToJsonSchema } from 'openai-zod-to-json-schema';

const queryExpensesSchema = z.object({
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (inclusive)'),
  endDate: z.string().optional().describe('End date in YYYY-MM-DD format (inclusive)'),
  category: z.string().optional().describe('Filter by category (e.g., Groceries, Dining, Entertainment)'),
  minAmount: z.number().optional().describe('Minimum amount threshold'),
  maxAmount: z.number().optional().describe('Maximum amount threshold'),
  vendor: z.string().optional().describe('Filter by vendor name'),
}).strict();

const jsonSchema = zodToJsonSchema(queryExpensesSchema);
console.log('Generated JSON Schema:');
console.log(JSON.stringify(jsonSchema, null, 2));