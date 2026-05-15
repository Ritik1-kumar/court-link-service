// src/components/NetworkErrorBoundary.jsx
import React, { Component } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

class NetworkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Network Error Boundary caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <p className="font-semibold">Connection Error</p>
                  <p className="text-sm">
                    We're having trouble connecting to the server. This might be
                    due to:
                  </p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li>Network connectivity issues</li>
                    <li>Session timeout</li>
                    <li>Server maintenance</li>
                  </ul>
                  <button
                    onClick={this.handleRetry}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry Connection
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NetworkErrorBoundary;
