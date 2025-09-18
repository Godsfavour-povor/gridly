// This file uses server-side code.
'use server';

/**
 * @fileOverview A question answering AI agent for spreadsheet data.
 *
 * - aiQuestionAnswering - A function that answers questions about spreadsheet data.
 * - AIQuestionAnsweringInput - The input type for the aiQuestionAnswering function.
 * - AIQuestionAnsweringOutput - The return type for the aiQuestionAnswering function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIQuestionAnsweringInputSchema = z.object({
  question: z.string().describe('The question to ask about the spreadsheet data.'),
  spreadsheetData: z.string().describe('The spreadsheet data as a string.'),
});
export type AIQuestionAnsweringInput = z.infer<typeof AIQuestionAnsweringInputSchema>;

const AIQuestionAnsweringOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about the spreadsheet data.'),
});
export type AIQuestionAnsweringOutput = z.infer<typeof AIQuestionAnsweringOutputSchema>;

export async function aiQuestionAnswering(input: AIQuestionAnsweringInput): Promise<AIQuestionAnsweringOutput> {
  return aiQuestionAnsweringFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiQuestionAnsweringPrompt',
  input: {schema: AIQuestionAnsweringInputSchema},
  output: {schema: AIQuestionAnsweringOutputSchema},
  prompt: `You are a data analyst that answers questions about spreadsheet data in clear, practical terms with visual formatting.

  Here is the spreadsheet data:
  {{spreadsheetData}}

  Here is the question:
  {{question}}

  Provide your answer in this exact format with visual indicators:

  **Main Issues Found:**
  📊 Key finding from data (specific to the question)
  ⚠️ Important observation (relevant detail)
  🔍 Additional insight (if applicable)

  **Why It Matters:**
  📈 Business impact (practical significance)
  ⚡ Operational relevance (how this affects decisions)
  🎯 Strategic importance (broader implications)

  **Suggested Fix:**
  ✅ Immediate action based on findings
  🔧 Follow-up investigation steps
  💡 Broader recommendations

  **Summary:**
  🎯 In short: [direct answer to the question with key numbers and actionable insight]

  Use these visual indicators appropriately:
  📈 for increases/growth/positive trends
  📉 for decreases/decline/negative trends
  ⬆️ for high/strong values
  ⬇️ for low/weak values
  ⚖️ for balanced/stable conditions

  Guidelines:
  - Be specific and direct - use actual numbers from the data when relevant
  - Explain what the numbers mean in practical terms
  - If the data doesn't contain the answer, say so clearly in the Summary
  - Reference specific rows, columns, or data points when helpful
  - Use plain English without jargon
  - Make your answer actionable when possible

  Keep it concise but complete.`,
});

const aiQuestionAnsweringFlow = ai.defineFlow(
  {
    name: 'aiQuestionAnsweringFlow',
    inputSchema: AIQuestionAnsweringInputSchema,
    outputSchema: AIQuestionAnsweringOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
