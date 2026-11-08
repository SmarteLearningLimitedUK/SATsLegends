export type RatioFractionQuestion = {
  kind?:'fraction'|'quantity'|'known-part'|'difference';
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
