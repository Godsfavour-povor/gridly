'use server';

/**
 * @fileOverview A forecasting AI agent for spreadsheet data.
 *
 * - aiForecasting - A function that provides forecasts based on spreadsheet data.
 * - AIForecastingInput - The input type for the aiForecasting function.
 * - AIForecastingOutput - The return type for the aiForecasting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIForecastingInputSchema = z.object({
  question: z.string().describe('The forecasting question to ask about the spreadsheet data.'),
  spreadsheetData: z.string().describe('The spreadsheet data as a string.'),
});
export type AIForecastingInput = z.infer<typeof AIForecastingInputSchema>;

const AIForecastingOutputSchema = z.object({
  forecast: z.string().describe('The forecast based on the provided data and question.'),
  confidence: z.enum(['High', 'Medium', 'Low']).describe('The confidence level of the forecast.'),
  assumptions: z.array(z.string()).describe('The assumptions made to generate the forecast.'),
});
export type AIForecastingOutput = z.infer<typeof AIForecastingOutputSchema>;

export async function aiForecasting(input: AIForecastingInput): Promise<AIForecastingOutput> {
  return aiForecastingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiForecastingPrompt',
  input: {schema: AIForecastingInputSchema},
  output: {schema: AIForecastingOutputSchema},
  prompt: `You are an AI assistant that specializes in forecasting from spreadsheet data.
  Analyze the historical data provided to make a prediction based on the user's question.

  Here is the spreadsheet data:
  {{spreadsheetData}}

  Here is the question:
  {{question}}

  Based on the data, provide a forecast. Your response must include:
  1. A direct answer to the user's question (the 'forecast').
  2. Your confidence in this forecast ('High', 'Medium', or 'Low'). A 'High' confidence requires clear, strong trends. 'Medium' is for less clear trends, and 'Low' is for volatile or sparse data.
  3. A list of assumptions you made (e.g., "Assumes past trends will continue," "Ignores external market factors not in the data").
  `,
});

const aiForecastingFlow = ai.defineFlow(
  {
    name: 'aiForecastingFlow',
    inputSchema: AIForecastingInputSchema,
    outputSchema: AIForecastingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
