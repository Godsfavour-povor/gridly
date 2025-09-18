import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Define multiple model configurations with fallback priority
const MODEL_CONFIGS = [
  {
    name: 'gemini-1.5-flash',
    model: 'googleai/gemini-1.5-flash',
    description: 'Primary Gemini 1.5 Flash - Fast and efficient'
  },
  {
    name: 'gemini-1.5-pro', 
    model: 'googleai/gemini-1.5-pro',
    description: 'Fallback Gemini 1.5 Pro - More capable but slower'
  },
  {
    name: 'gemini-1.0-pro',
    model: 'googleai/gemini-1.0-pro', 
    description: 'Legacy Gemini 1.0 Pro - Most stable'
  }
];

// Create AI instances for each model
export const aiInstances = MODEL_CONFIGS.map(config => ({
  ...config,
  instance: genkit({
    plugins: [googleAI()],
    model: config.model,
  })
}));

// Primary AI instance (gemini-1.5-flash)
export const ai = aiInstances[0].instance;

// Fallback AI function that tries different models
export async function executeWithFallback<T>(
  operation: (aiInstance: any) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < aiInstances.length; i++) {
    const config = aiInstances[i];
    console.log(`Attempting with model: ${config.name} (${config.description})`);
    
    try {
      const result = await operation(config.instance);
      if (i > 0) {
        console.log(`✅ Successfully used fallback model: ${config.name}`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message?.toLowerCase() || '';
      
      // If it's an overload error, try next model immediately
      if (errorMessage.includes('overloaded') || errorMessage.includes('service unavailable')) {
        console.log(`❌ Model ${config.name} overloaded, trying next...`);
        continue;
      }
      
      // For other errors, still try next model but log differently
      console.log(`❌ Model ${config.name} failed: ${error.message}`);
      
      // If this is the last model, throw the error
      if (i === aiInstances.length - 1) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('All models failed');
}

// Get current active model info
export function getCurrentModelInfo() {
  return MODEL_CONFIGS[0];
}

// Get all available models
export function getAllModelInfo() {
  return MODEL_CONFIGS;
}