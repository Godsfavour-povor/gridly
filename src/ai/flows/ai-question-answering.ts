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
  prompt: `You are an AI assistant that answers questions about spreadsheet data.

  Here is the spreadsheet data:
  {{spreadsheetData}}

  Here is the question:
  {{question}}

  Answer the question using the spreadsheet data. Be concise and clear.
  `,
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
