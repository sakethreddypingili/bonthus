import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 bg-red-50/50 border-2 border-red-200 rounded-3xl space-y-4 animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1.5 max-w-md">
            <h3 className="text-sm font-black text-black uppercase tracking-wider">
              Something went wrong
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed">
              An unexpected error occurred in the viewport. Try reloading or resetting.
            </p>
            {this.state.error && (
              <pre className="text-[9px] bg-red-950 text-red-200 p-3 rounded-xl overflow-x-auto text-left font-mono max-h-40 border border-red-800">
                {this.state.error.stack || this.state.error.message || String(this.state.error)}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reload Viewport
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
