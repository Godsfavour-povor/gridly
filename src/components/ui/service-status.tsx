'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface ServiceStatus {
  isHealthy: boolean;
  lastFailureTime: number;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
}

interface ServiceStatusIndicatorProps {
  status?: ServiceStatus;
  error?: string;
  isLoading?: boolean;
  onRetry?: () => void;
  retryDisabled?: boolean;
}

export function ServiceStatusIndicator({ 
  status, 
  error, 
  isLoading, 
  onRetry,
  retryDisabled 
}: ServiceStatusIndicatorProps) {
  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Processing your data...
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This may take a moment depending on data size and current AI service load.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!error && (!status || status.isHealthy)) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              AI Analysis Service: Online
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const isOverloadError = error.toLowerCase().includes('overload') || 
                           error.toLowerCase().includes('service unavailable') ||
                           error.toLowerCase().includes('high demand');
    
    const isCircuitBreakerError = error.toLowerCase().includes('temporarily offline') ||
                                 error.toLowerCase().includes('persistent issues');

    return (
      <Card className={`border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 ${
        isCircuitBreakerError ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : ''
      }`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {isCircuitBreakerError ? (
                <WifiOff className="h-4 w-4 text-red-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              )}
              <div className="space-y-2 flex-1">
                <p className={`text-sm font-medium ${
                  isCircuitBreakerError 
                    ? 'text-red-900 dark:text-red-100' 
                    : 'text-orange-900 dark:text-orange-100'
                }`}>
                  {isCircuitBreakerError ? 'AI Service Temporarily Offline' : 'AI Service Issue'}
                </p>
                <p className={`text-xs ${
                  isCircuitBreakerError 
                    ? 'text-red-700 dark:text-red-300' 
                    : 'text-orange-700 dark:text-orange-300'
                }`}>
                  {error}
                </p>
                
                {isOverloadError && status && (
                  <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                    <Clock className="h-3 w-3" />
                    <span>
                      Failed attempts: {status.consecutiveFailures}/5
                      {status.lastFailureTime > 0 && (
                        <span className="ml-2">
                          Last failure: {Math.floor((Date.now() - status.lastFailureTime) / 1000)}s ago
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {onRetry && !isCircuitBreakerError && (
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRetry}
                  disabled={retryDisabled}
                  className="text-xs"
                >
                  {retryDisabled ? 'Please wait...' : 'Try Again'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// Hook to manage retry state
export function useRetryState(initialDelay = 5000) {
  const [retryDisabled, setRetryDisabled] = useState(false);
  
  const handleRetry = (callback: () => void) => {
    setRetryDisabled(true);
    callback();
    
    // Re-enable retry after a delay
    setTimeout(() => {
      setRetryDisabled(false);
    }, initialDelay);
  };
  
  return { retryDisabled, handleRetry };
}