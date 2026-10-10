import React, { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="flex items-center justify-center p-8 h-full">
        <div className="max-w-sm w-full bg-surface border border-border rounded-lg shadow-card p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-danger mx-auto" />
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-sm text-slate-500">{error.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={this.reset}
            className="min-h-touch-target px-4 py-2 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
