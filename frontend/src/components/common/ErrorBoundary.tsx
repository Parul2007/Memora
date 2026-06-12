import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center bg-[#FAFAF9] border border-dashed border-[#e7e5e4] rounded-2xl m-4">
          <AlertTriangle size={48} className="text-[#C5221F] mb-4" />
          <h2 className="text-xl font-semibold text-[#11120D] mb-2">Something went wrong</h2>
          <p className="text-sm text-[#565449] mb-6 max-w-md">
            {this.props.fallbackMessage || "An unexpected error occurred while rendering this component. The Memora team has been notified."}
          </p>
          {this.state.error && (
            <div className="bg-white border border-[#e7e5e4] p-3 rounded-lg text-xs text-[#A0988A] font-mono mb-6 max-w-lg overflow-auto">
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-[#11120D] text-white rounded-lg hover:bg-[#2c2c2c] transition-colors text-sm font-medium"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
