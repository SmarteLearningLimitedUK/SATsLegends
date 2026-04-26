/// <reference types="vite/client" />

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.mpeg' {
  const value: string;
  export default value;
}

declare module '*.ogg' {
  const value: string;
  export default value;
}

declare module '*.mp3.mpeg' {
  const value: string;
  export default value;
}

interface Window {
  __SAT_VISUAL__?: {
    getLevelRoutes?: () => Array<{
      islandId: number;
      levelId: number;
      path: string;
      label: string;
      isBoss?: boolean;
    }>;
    getWellbeingActivities?: () => string[];
    openWellbeingActivity?: (id: string) => void;
    showCorrectFeedback?: () => void;
    showWrongFeedback?: () => void;
    openPauseModal?: () => void;
    closePauseModal?: () => void;
    openEndLevel?: (kind: 'victory' | 'gameover') => void;
    closeEndLevel?: () => void;
    openWellbeingComplete?: (title?: string) => void;
    closeWellbeingComplete?: () => void;
  };
}
