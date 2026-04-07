import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

/**
 * ErrorDisplay component
 *
 * Displays an error message with an optional retry button.
 * Used to surface data fetch failures and other recoverable errors.
 *
 * Requirements: 7.4
 */
export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        {onRetry && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
