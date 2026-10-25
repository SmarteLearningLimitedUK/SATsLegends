import React, { useLayoutEffect, useRef, useState } from 'react';

interface GameplayContentViewportProps {
  children: React.ReactNode;
  ambientImage?: string;
  fit?: 'scale' | 'reflow';
}

/**
 * Shared gameplay content wrapper:
 * mini-games should render mission/puzzle/input/feedback only.
 * Shell-level chrome (top HUD + bottom utility dock) is owned by App shell.
 */
const GameplayContentViewport: React.FC<GameplayContentViewportProps> = ({ children, ambientImage, fit = 'scale' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentScale, setContentScale] = useState(1);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      setContentScale(1);
      return;
    }
    let frameId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        container.style.setProperty('--gameplay-scene-width', `${containerWidth}px`);
        container.style.setProperty('--gameplay-scene-height', `${containerHeight}px`);
        if (fit === 'reflow') {
          setContentScale(1);
          return;
        }
        if (!containerWidth || !containerHeight) {
          setContentScale(1);
          return;
        }

        const contentWidth = content.scrollWidth;
        const contentHeight = content.scrollHeight;
        if (!contentWidth || !contentHeight) {
          setContentScale(1);
          return;
        }

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
  }, [fit]);

  return (
    <div
      ref={containerRef}
      data-gameplay-content-viewport="true"
      data-content-fit={fit}
      className="game-shell-zone game-shell-zone-playfield minigame-content-viewport relative flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      {ambientImage ? <div data-game-wide-ambient="true" aria-hidden="true"><img src={ambientImage} alt="" draggable={false} /></div> : null}
      <div className="relative z-[2] flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={contentRef}
          data-gameplay-content-stage="true"
          data-content-scale={fit === 'reflow' ? 1 : contentScale}
          style={{
            // Keep a containing block for existing fixed-position game prompts.
            // Reflow never shrinks, but removing this transform would anchor
            // those prompts to the window and put them behind the shared HUD.
            transform: fit === 'reflow' ? 'scale(1)' : `scale(${contentScale})`,
            transformOrigin: 'top center',
            height: '100%',
            width: '100%',
          }}
          className="gameplay-content-stage flex h-full w-full flex-col"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default GameplayContentViewport;
