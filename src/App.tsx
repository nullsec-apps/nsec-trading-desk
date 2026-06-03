import { Component, ErrorInfo, ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AuthGate } from './components/AuthGate';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'unexpected desk fault' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('NSECDESK fault:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0A0E0D] text-[#D6E4DF] flex items-center justify-center px-4">
          <div className="w-full max-w-md border border-[#FF4D5E]/40 bg-[#111817] p-6 flex flex-col items-center gap-4 text-center">
            <AlertTriangle size={26} className="text-[#FF4D5E]" strokeWidth={1.5} />
            <div className="flex flex-col gap-1.5">
              <span className="font-display text-sm tracking-[0.16em] uppercase text-[#FF4D5E]">
                desk fault
              </span>
              <p className="font-sans text-xs text-[#5C6B66] break-words leading-relaxed">
                {this.state.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="group inline-flex items-center gap-1.5 h-10 px-4 border border-[#1F2A27] bg-[#0A0E0D] font-display text-[11px] tracking-[0.16em] uppercase text-[#D6E4DF] hover:border-[#1FE07A] hover:text-[#1FE07A] transition-colors duration-150"
            >
              <RefreshCw
                size={13}
                strokeWidth={2}
                className="group-hover:rotate-90 transition-transform duration-200"
              />
              reboot desk
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full bg-[#0A0E0D] overflow-x-hidden">
        <AuthGate />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111817',
              color: '#D6E4DF',
              border: '1px solid #1F2A27',
              borderRadius: 0,
              fontFamily: 'JetBrains Mono, IBM Plex Mono, monospace',
              fontSize: '12px',
              letterSpacing: '0.04em',
            },
            success: { iconTheme: { primary: '#1FE07A', secondary: '#0A0E0D' } },
            error: { iconTheme: { primary: '#FF4D5E', secondary: '#0A0E0D' } },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
