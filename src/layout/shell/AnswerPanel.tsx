import React from 'react';

type AnswerPanelProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Foundation slot: AnswerPanel.
 * Sizing/positioning is locked by the shell CSS.
 */
const AnswerPanel: React.FC<AnswerPanelProps> = ({ children, className }) => (
  <div className={['answer-panel', className].filter(Boolean).join(' ')} data-shell-slot="answers">
    {children}
  </div>
);

export default AnswerPanel;

