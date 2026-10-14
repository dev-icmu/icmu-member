import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MorphingModal } from '@/components/motion/morphing-modal';
import { Button } from '@/components/motion/button/base';
import { X } from 'lucide-react';

// Native top-layer focus trapping and Escape, with beUI's panel transitions.
export function ApplicationDialog({ step, title, busy, onClose, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const requestClose = () => { if (!busy) setClosing(true); };
  useEffect(() => {
    const previousFocus = document.activeElement;
    const node = dialog.current;
    node.showModal();
    node.querySelector('h3')?.focus({ preventScroll: true });
    return () => { node.close(); previousFocus?.focus?.(); };
  }, []);
  return createPortal(<dialog ref={dialog} className="adm-application-layer" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); requestClose(); }}>
    <MorphingModal viewId={closing ? null : step} onClose={requestClose} onExitComplete={() => { if (closing) onClose(); }} placement="center" className="adm-application-modal"
      header={<header className="adm-application-heading">
        <div><span className="adm-eyebrow">ICMU MEMBERSHIP</span><h2 id={titleId}>{title}</h2></div>
        <Button type="button" variant="ghost" size="icon" className="adm-application-close" onClick={requestClose} disabled={busy || closing} aria-label="Close application"><X size={20} /></Button>
      </header>}>
      {typeof children === 'function' ? children(requestClose) : children}
    </MorphingModal>
  </dialog>, document.body);
}
