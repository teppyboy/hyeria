import { Component, type ErrorInfo, type ReactNode } from "react";
import { ApiError } from "@/lib/api/errors";
import { preferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";

function safeMessage(error: Error): string {
  const language = preferencesStore.getState().language;
  return error instanceof ApiError ? error.message : translate(language, "feedback.error");
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Never log errors that may contain backend data. */
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section role="alert" className="m-6 rounded-md border border-destructive p-4">
        <h2 className="font-semibold">{safeMessage(this.state.error)}</h2>
        <button className="mt-3 underline" onClick={() => this.setState({ error: null })}>
          {translate(preferencesStore.getState().language, "feedback.retry")}
        </button>
      </section>
    );
  }
}
