/**
 * App Error Boundary
 * 
 * Global error boundary that catches React render errors and displays
 * a fallback screen. Provides recovery options without full app reload.
 * 
 * Features:
 * - Catches all render errors in the React tree
 * - Logs errors with context
 * - Captures correlation ID
 * - Provides retry without full reload
 * - Navigation to support chat
 * 
 * @module system/AppErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CrashFallbackScreen } from '../screens/system/CrashFallbackScreen';
import { useCorrelationStore, SupportContext } from './correlationStore';

// =====================================
// TYPES
// =====================================

interface Props {
  children: ReactNode;
  onNavigateToSupport?: (context: SupportContext) => void;
  onNavigateToHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  correlationId: string | null;
  retryCount: number;
}

// =====================================
// ERROR BOUNDARY CLASS
// =====================================

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    correlationId: null,
    retryCount: 0,
  };

  /**
   * Static lifecycle method called when error is thrown
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error
    console.error('[AppErrorBoundary] Caught error:', error);
    console.error('[AppErrorBoundary] Component stack:', errorInfo.componentStack);

    // Get correlation ID from store
    const correlationId = useCorrelationStore.getState().lastCorrelationId;

    // Update state with error details
    this.setState({
      errorInfo,
      correlationId,
    });

    // Log to error tracking service (if configured)
    this.logErrorToService(error, errorInfo, correlationId);

    // Update correlation store with error context
    useCorrelationStore.getState().setErrorContext({
      correlationId: correlationId ?? `crash-${Date.now()}`,
      errorCode: 'RENDER_ERROR',
      errorMessage: error.message,
    });
  }

  /**
   * Log error to external service
   */
  private logErrorToService(
    error: Error,
    errorInfo: ErrorInfo,
    correlationId: string | null
  ): void {
    // TODO: Integrate with error tracking service (Sentry, Crashlytics, etc.)
    const errorReport = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      correlationId,
      timestamp: Date.now(),
    };

    console.log('[AppErrorBoundary] Error report:', errorReport);
  }

  /**
   * Handle retry - reset error state but clear unstable cache
   */
  handleRetry = (): void => {
    console.log('[AppErrorBoundary] Retry attempt:', this.state.retryCount + 1);

    // Clear any unstable React state/cache
    // This is a soft reset - not a full app reload
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  /**
   * Handle report issue - navigate to support chat
   */
  handleReportIssue = (context: SupportContext): void => {
    console.log('[AppErrorBoundary] Opening support with context:', context);

    // Reset error state first
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Navigate to support
    this.props.onNavigateToSupport?.(context);
  };

  /**
   * Handle go home - safe navigation reset
   */
  handleGoHome = (): void => {
    console.log('[AppErrorBoundary] Navigating to home');

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: null,
    });

    // Navigate to home
    this.props.onNavigateToHome?.();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <CrashFallbackScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo ?? undefined}
          correlationId={this.state.correlationId}
          onRetry={this.handleRetry}
          onReportIssue={this.handleReportIssue}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

// =====================================
// WRAPPER WITH NAVIGATION CONTEXT
// =====================================

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  navigationRef?: React.RefObject<any>;
}

/**
 * Wrapper component that provides navigation context to error boundary
 */
export function AppErrorBoundaryWithNavigation({
  children,
  navigationRef,
}: ErrorBoundaryWrapperProps): React.ReactElement {
  const handleNavigateToSupport = (context: SupportContext): void => {
    if (navigationRef?.current) {
      // Navigate to support screen with context
      navigationRef.current.navigate('Support', {
        screen: 'SupportChat',
        params: { context },
      });
    }
  };

  const handleNavigateToHome = (): void => {
    if (navigationRef?.current) {
      // Reset to home tab
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'Home' } }],
      });
    }
  };

  return (
    <AppErrorBoundary
      onNavigateToSupport={handleNavigateToSupport}
      onNavigateToHome={handleNavigateToHome}
    >
      {children}
    </AppErrorBoundary>
  );
}

export default AppErrorBoundary;
