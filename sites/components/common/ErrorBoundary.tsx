"use client";
import React from "react";

interface ErrorBoundaryState { hasError: boolean; message?: string }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // TODO: hook analytics/logging here
    console.error("Module render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 text-sm">
          模块暂时不可用，请稍后再试。
        </div>
      );
    }
    return this.props.children as any;
  }
}


