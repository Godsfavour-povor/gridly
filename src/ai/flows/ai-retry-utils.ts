/**
 * @fileOverview Enhanced retry utility for handling AI service overload
 * Provides retry logic with circuit breaker pattern for better reliability
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBackoff?: boolean;
}

export interface ServiceStatus {
  isHealthy: boolean;
  lastFailureTime: number;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
}

const RETRY_CONFIG = {
  maxRetries: 4, // Increased to 4 retries
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds (increased)
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Open circuit after 5 consecutive failures
  resetTimeout: 15000, // 15 seconds before attempting to close circuit (reduced from 60s)
};

// Global service status tracker
let serviceStatus: ServiceStatus = {
  isHealthy: true,
  lastFailureTime: 0,
  consecutiveFailures: 0,
  circuitBreakerOpen: false,
};

export function getServiceStatus(): ServiceStatus {
  return { ...serviceStatus };
}

export function resetServiceStatus(): void {
  serviceStatus = {
    isHealthy: true,
    lastFailureTime: 0,
    consecutiveFailures: 0,
    circuitBreakerOpen: false,
  };
  console.log('Circuit breaker manually reset');
}

export function forceCircuitBreakerReset(): void {
  resetServiceStatus();
}

// Add emergency reset function
export function emergencyReset(): void {
  serviceStatus = {
    isHealthy: true,
    lastFailureTime: 0,
    consecutiveFailures: 0,
    circuitBreakerOpen: false,
  };
  console.log('Emergency circuit breaker reset - service restored');
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  retryCount = 0,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...RETRY_CONFIG, ...options };
  
  // Check circuit breaker
  if (serviceStatus.circuitBreakerOpen) {
    const timeSinceLastFailure = Date.now() - serviceStatus.lastFailureTime;
    if (timeSinceLastFailure < CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      throw new Error(
        `AI service is temporarily unavailable due to repeated failures. ` +
        `Please try again in ${Math.ceil((CIRCUIT_BREAKER_CONFIG.resetTimeout - timeSinceLastFailure) / 1000)} seconds.`
      );
    } else {
      // Attempt to close circuit breaker
      serviceStatus.circuitBreakerOpen = false;
      serviceStatus.consecutiveFailures = 0;
      console.log('Circuit breaker reset - attempting to restore service');
    }
  }

  try {
    const result = await operation();
    
    // Success - reset failure tracking
    if (serviceStatus.consecutiveFailures > 0) {
      serviceStatus.consecutiveFailures = 0;
      serviceStatus.isHealthy = true;
      console.log('AI service recovered successfully');
    }
    
    return result;
  } catch (error: any) {
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Check if it's a retryable error
    const isRetryable = errorMessage.includes('overloaded') || 
                       errorMessage.includes('service unavailable') ||
                       errorMessage.includes('rate limit') ||
                       errorMessage.includes('timeout') ||
                       errorMessage.includes('503') ||
                       errorMessage.includes('502') ||
                       errorMessage.includes('504') ||
                       errorMessage.includes('429');
    
    if (!isRetryable) {
      throw error; // Don't retry non-retryable errors
    }
    
    // Track failure
    serviceStatus.consecutiveFailures++;
    serviceStatus.lastFailureTime = Date.now();
    serviceStatus.isHealthy = false;
    
    // Open circuit breaker if threshold reached
    if (serviceStatus.consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      serviceStatus.circuitBreakerOpen = true;
      console.log('Circuit breaker opened due to repeated failures');
      throw new Error(
        `AI service is experiencing persistent issues and has been temporarily disabled. ` +
        `Please try again in a few minutes. If the problem persists, contact support.`
      );
    }
    
    // Retry with exponential backoff
    if (retryCount < config.maxRetries) {
      const delay = config.exponentialBackoff !== false
        ? Math.min(
            config.baseDelay * Math.pow(2, retryCount),
            config.maxDelay
          )
        : config.baseDelay;
      
      const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
      const finalDelay = Math.floor(delay + jitter);
      
      console.log(
        `AI service overloaded. Retry ${retryCount + 1}/${config.maxRetries} ` +
        `after ${finalDelay}ms delay... (${serviceStatus.consecutiveFailures} consecutive failures)`
      );
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
      return withRetry(operation, retryCount + 1, options);
    }
    
    // All retries exhausted
    const timeToWait = Math.ceil((CIRCUIT_BREAKER_CONFIG.resetTimeout - (Date.now() - serviceStatus.lastFailureTime)) / 1000);
    const waitMessage = timeToWait > 0 
      ? ` Please wait ${timeToWait} seconds before trying again.`
      : ' Please try again.';
    
    throw new Error(
      `AI service is currently overloaded and unavailable after ${config.maxRetries} attempts. ` +
      `This is likely due to high demand on the AI model.${waitMessage}`
    );
  }
}