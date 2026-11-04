import React from 'react';
import {createPortal} from 'react-dom';
import {useDialogFocus} from '../../../../src/components/game-ui/useDialogFocus';
export default function PaperModelViewer({open,prompt,children,onClose}:{open:boolean;prompt:string;children:React.ReactNode;onClose:()=>void}){const focus=useDialogFocus(open,onClose);return open?createPortal(<div className="paper-editor-scrim"><section ref={focus} tabIndex={-1} className="paper-editor paper-model-viewer" role="dialog" aria-modal="true" aria-label="Larger teaching model"><div className="paper-editor-heading"><h2>Teaching model</h2><button type="button" data-dialog-primary onClick={onClose}>Done</button></div><p>{prompt}</p><div className="paper-viewer-model">{children}</div></section></div>,document.body):null}
