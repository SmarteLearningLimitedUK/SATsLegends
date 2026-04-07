import React, { useLayoutEffect, useRef, useState } from 'react';

interface GameplayContentViewportProps {
  children: React.ReactNode;
}

/**
 * Shared gameplay content wrapper:
 * mini-games should render mission/puzzle/input/feedback only.
 * Shell-level chrome (top HUD + bottom utility dock) is owned by App shell.
 */
const GameplayContentViewport: React.FC<GameplayContentViewportProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentScale, setContentScale] = useState(1);

  useLayoutEffect(() => {
    let frameId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        if (!containerWidth || !containerHeight) return;

        const contentWidth = content.scrollWidth;
        const contentHeight = content.scrollHeight;
        if (!contentWidth || !contentHeight) return;

        const nextScale = Math.min(
          1,
          containerWidth / contentWidth,
          containerHeight / contentHeight,
        );

        setContentScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
      });
    });

    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-gameplay-content-viewport="true"
      className="game-shell-zone game-shell-zone-playfield minigame-content-viewport relative flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(5,16,46,0.18)_0%,rgba(5,16,46,0.08)_40%,rgba(5,16,46,0.22)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_12%,rgba(56,189,248,0.1)_0%,rgba(56,189,248,0)_40%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.1)_0%,rgba(251,191,36,0)_36%)]" />
      <div className="relative z-[2] flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={contentRef}
          style={{
            transform: `scale(${contentScale})`,
            transformOrigin: 'top center',
            height: '100%',
            width: '100%',
          }}
          className="flex h-full w-full flex-col"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default GameplayContentViewport;
