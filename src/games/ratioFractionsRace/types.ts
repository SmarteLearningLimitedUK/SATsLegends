export type RatioFractionQuestion = {
  id: string;
  prompt: string;
  ratio: number[];
  labels: string[];
  target: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
};

export type RaceStatus =
  | 'intro'
  | 'showingQuestion'
  | 'answering'
  | 'playerMove'
  | 'playerWin';
