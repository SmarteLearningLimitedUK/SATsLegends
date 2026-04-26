import React from 'react';

type QuestionPanelProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Foundation slot: QuestionPanel.
 * This is content-only; sizing/positioning is locked by the shell CSS.
 */
const QuestionPanel: React.FC<QuestionPanelProps> = ({ children, className }) => (
  <div className={['question-panel', className].filter(Boolean).join(' ')} data-shell-slot="question">
    {children}
  </div>
);

export default QuestionPanel;

