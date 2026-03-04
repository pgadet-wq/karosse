"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            {this.state.error?.message || "Quelque chose s'est mal passé."}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Réessayer"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
