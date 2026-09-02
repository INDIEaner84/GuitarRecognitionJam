/**
 * Verhindert, dass ein Fehler in einem Modul die ganze App mitreißt.
 * Stattdessen gibt es eine sichtbare Meldung plus „Neu laden“.
 */
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Uncaught UI error:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#04060f] text-slate-100 p-6">
        <div className="max-w-lg w-full border border-rose-500/40 bg-rose-500/5 rounded-2xl p-8">
          <h1 className="text-lg font-black uppercase tracking-widest text-rose-300 mb-3">
            ⚠️ Modul abgestürzt
          </h1>
          <p className="text-sm text-slate-300 mb-4">
            Ein Modul hat einen Fehler verursacht. Der Rest der App bleibt nutzbar —
            Fortschritt und Einstellungen sind gespeichert.
          </p>
          <pre className="text-[11px] text-rose-200/80 bg-black/40 rounded-lg p-3 overflow-auto max-h-40 mb-5">
            {error.message}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-200 text-xs font-black uppercase tracking-widest hover:bg-cyan-500/20"
            >
              Erneut versuchen
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-xs font-black uppercase tracking-widest hover:border-slate-400"
            >
              App neu laden
            </button>
          </div>
        </div>
      </div>
    );
  }
}
