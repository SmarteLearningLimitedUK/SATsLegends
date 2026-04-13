import React from 'react';

type GameLoadContext = {
  gameType?: string;
  levelId?: number;
  blueprintKey?: string | null;
  title?: string | null;
};

interface GameLoadBoundaryProps {
  children: React.ReactNode;
  onBack?: () => void;
  context?: GameLoadContext;
}

interface GameLoadBoundaryState {
  error: Error | null;
}

const formatContext = (context?: GameLoadContext) => {
  if (!context) return '';
  const parts = [
    context.gameType ? `type=${context.gameType}` : null,
    context.blueprintKey ? `blueprint=${context.blueprintKey}` : null,
    Number.isFinite(context.levelId) ? `level=${context.levelId}` : null,
  ].filter(Boolean);
  return parts.join(' • ');
};

const GameLoadFallback: React.FC<{
  title: string;
  subtitle: string;
  details?: string;
  onRetry?: () => void;
  onBack?: () => void;
}> = ({ title, subtitle, details, onRetry, onBack }) => (
  <div className="flex h-full w-full items-center justify-center px-4 py-6">
    <div className="relative w-full max-w-xl overflow-hidden rounded-[1.6rem] border border-cyan-100/25 bg-[linear-gradient(180deg,rgba(14,37,94,0.92),rgba(9,20,52,0.92))] p-6 text-center shadow-[0_18px_34px_rgba(2,6,23,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),rgba(2,6,23,0)_55%)]" />
      <div className="relative flex flex-col gap-4">
        <div>
          <div className="text-[12px] font-black uppercase tracking-[0.24em] text-cyan-100/70">
            Game Load
          </div>
          <div className="mt-2 text-[clamp(1rem,2.6vw,1.4rem)] font-black text-white">
            {title}
          </div>
          <div className="mt-2 text-sm text-cyan-100/85">{subtitle}</div>
          {details ? (
            <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
              {details}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="ui-button-primary inline-flex min-h-[44px] items-center justify-center rounded-[1.1rem] border border-white/20 px-5 text-xs font-black uppercase tracking-[0.16em] text-white"
            >
              Try Again
            </button>
          ) : null}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="ui-button-secondary inline-flex min-h-[44px] items-center justify-center rounded-[1.1rem] border border-white/12 px-5 text-xs font-black uppercase tracking-[0.16em] text-white/90"
            >
              Back to Map
            </button>
          ) : null}
        </div>
      </div>
    </div>
  </div>
);

class GameLoadBoundary extends React.Component<GameLoadBoundaryProps, GameLoadBoundaryState> {
  declare props: Readonly<GameLoadBoundaryProps>;
  declare setState: React.Component<GameLoadBoundaryProps, GameLoadBoundaryState>['setState'];
  state: GameLoadBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    const contextInfo = formatContext(this.props.context);
    console.error('[GameLoadBoundary] Failed to render game.', contextInfo, error);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const contextInfo = formatContext(this.props.context);
    const title = this.props.context?.title ?? 'This game had trouble loading';
    return (
      <GameLoadFallback
        title={title}
        subtitle="We hit an issue while starting this mini-game."
        details={contextInfo || undefined}
        onRetry={this.handleRetry}
        onBack={this.props.onBack}
      />
    );
  }
}

export default GameLoadBoundary;
export { GameLoadFallback };
