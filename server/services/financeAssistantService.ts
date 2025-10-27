import dotenv from 'dotenv';
// import { FinanceAgent } from '../agent';
import { OpenAIFinanceAgent } from '../agent/openai-agent';
import { loadExpensesFromCSV } from '../utils/csv-loader';
import showdown from 'showdown';

// Load environment variables from server directory
dotenv.config({ path: 'server/.env' });

const expenses = loadExpensesFromCSV('server/expenses_data/expenses_2024-2025.csv');
// Use the new OpenAI agent instead of the AI SDK agent
const agent = new OpenAIFinanceAgent(expenses);

const convertMDtoHTML = (text: string) => {
  const converter = new showdown.Converter();
  const html = converter.makeHtml(text);
  return html;
}

export const processFinanceQuestion = async (question: string): Promise<string> => {
  console.log('Received question:', question);
  const answer = await agent.run(question);
  console.log('Agent response:', answer);
  const html = convertMDtoHTML(answer);
  console.log('Converted to HTML:', html);
  return html;
};
