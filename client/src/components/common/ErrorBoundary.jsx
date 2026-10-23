import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6 font-sans">
          <div className="bg-surface-0 border border-border rounded-xl p-6 sm:p-8 max-w-md w-full shadow-xs text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-900">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h3>
              <p className="text-xs text-text-500 leading-relaxed">
                {this.state.error?.message?.includes('removeChild')
                  ? 'Translation update in progress. Please refresh the view.'
                  : 'An unexpected rendering error occurred in this view.'}
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 bg-ink-900 hover:bg-ink-700 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors shadow-xs"
            >
              <RefreshCw size={14} /> Refresh View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
