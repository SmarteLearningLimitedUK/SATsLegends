import React from 'react';
import { MiniGamePracticeBriefing } from '../../app/gameplaySessionContract';

type PracticeIntroPopupProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  briefing?: MiniGamePracticeBriefing | null;
  actionLabel?: string;
  onAction: () => void;
};

const PracticeIntroPopup: React.FC<PracticeIntroPopupProps> = () => null;

export default PracticeIntroPopup;
