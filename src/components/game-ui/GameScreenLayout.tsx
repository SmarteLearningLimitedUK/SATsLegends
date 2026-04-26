import React from 'react';
import GameShell from '../../layout/shell/GameShell';

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
  <GameShell
    className={cn(className)}
    question={top ? <div className={cn(topClassName)}>{top}</div> : undefined}
    gameplay={<div className={cn(mainClassName)}>{main}</div>}
    answers={bottom ? <div className={cn(bottomClassName)}>{bottom}</div> : undefined}
    overlay={overlay}
  />
);

export default GameScreenLayout;
