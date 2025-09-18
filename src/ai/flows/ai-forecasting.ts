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
  prompt: `You are a business analyst that creates clear, practical forecasts from data.

  Here is the spreadsheet data:
  {{spreadsheetData}}

  Here is the question:
  {{question}}

  Provide a forecast that business managers can understand and act on:

  1. **Forecast**: Give a direct, specific answer in plain English. Include concrete numbers or ranges when possible.
     - Good: "Sales will likely reach $85,000-$95,000 next quarter"
     - Avoid: "Sales show positive trends"

  2. **Confidence Level**: 
     - High: Clear, strong patterns with consistent data
     - Medium: Some trends visible but with variability
     - Low: Limited data or highly volatile patterns

  3. **Assumptions**: List the key assumptions behind your forecast:
     - "Assumes current growth rate continues"
     - "Based on seasonal patterns from last year"
     - "Excludes potential market disruptions"

  Be specific and actionable. Explain what the numbers mean for business decisions.`,
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
