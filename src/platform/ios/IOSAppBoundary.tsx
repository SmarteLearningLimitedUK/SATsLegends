import { Component, type ReactNode } from 'react';
import { GameLoadFallback } from '../../components/GameLoadBoundary';

/** Covers account/bootstrap rendering outside the individual game boundary. */
export default class IOSAppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  declare props: Readonly<{ children: ReactNode }>;
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="ios-app-recovery" aria-label="App recovery">
      <GameLoadFallback title="Let’s reopen your adventure"
        subtitle="The app had trouble opening this screen. Try again, or return to the start."
        onRetry={() => window.location.reload()}
        backLabel="Return to start"
        onBack={() => window.location.assign('/play')} />
    </main>;
  }
}
