import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { asset } from '../assets';

export default function NativeDialog({ titleId, onClose, children, kind }: { titleId: string; onClose: () => void; children: ReactNode; kind: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`native-dialog native-dialog--${kind}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} data-native-dialog={kind}>
    <div className="native-dialog-layout">
      <aside className="native-dialog-world" aria-hidden="true"><img className="native-dialog-scenery" src={asset('backgrounds', 'bg_acropolis_landscape')} alt=""/>
        <img className="native-dialog-logo" src={asset('branding', 'logo_matharia')} alt=""/>
        <img className="native-dialog-hero" src={asset('heroes', 'hero_barratt_host_v3')} alt=""/>
      </aside>
      <section className="native-dialog-content">{children}</section>
      <button className="native-dialog-close" type="button" aria-label="Close" onClick={onClose} autoFocus><X size={23}/></button>
    </div>
  </dialog>;
}

export function AppleMark() {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M17.05 12.54c.03 3.18 2.79 4.24 2.82 4.25-.02.07-.44 1.51-1.45 3-.88 1.29-1.8 2.57-3.24 2.6-1.41.03-1.86-.84-3.47-.84-1.61 0-2.11.81-3.45.87-1.39.05-2.45-1.4-3.33-2.68C3.13 17.12 1.76 12.34 3.6 9.12c.92-1.6 2.56-2.61 4.34-2.64 1.35-.03 2.63.92 3.46.92.83 0 2.39-1.14 4.03-.97.69.03 2.62.28 3.86 2.1-.1.06-2.3 1.34-2.27 4.01h.03ZM14.4 4.7c.73-.89 1.22-2.13 1.08-3.36-1.05.04-2.32.7-3.08 1.59-.68.79-1.28 2.05-1.12 3.26 1.17.09 2.37-.6 3.12-1.49Z"/></svg>;
}
