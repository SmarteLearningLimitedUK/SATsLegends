import React from 'react';

type GameScreenLayoutProps = {
  top?: React.ReactNode;
  main: React.ReactNode;
  bottom?: React.ReactNode;
  overlay?: React.ReactNode;
  className?: string;
  topClassName?: string;
  mainClassName?: string;
  bottomClassName?: string;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const GameScreenLayout: React.FC<GameScreenLayoutProps> = ({
  top,
  main,
  bottom,
  overlay,
  className,
  topClassName,
  mainClassName,
  bottomClassName,
}) => (
  <div className={cn('game-screen-layout structured-game-layout', className)}>
    {top ? (
      <div className={cn('game-screen-region game-screen-top game-shell-zone-hud', topClassName)}>
        {top}
      </div>
    ) : null}
    <div className={cn('game-screen-region game-screen-main game-shell-zone-playfield', mainClassName)}>
      {main}
    </div>
    {bottom ? (
      <div className={cn('game-screen-region game-screen-bottom game-shell-zone-actions', bottomClassName)}>
        {bottom}
      </div>
    ) : null}
    {overlay}
  </div>
);

export default GameScreenLayout;
