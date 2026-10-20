import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/motion/button/base';
import { MorphingModal } from '@/components/motion/morphing-modal';

export function AdminDialog(props) {
  return props.drawer ? <NativeAdminDrawer {...props}/> : <AdminMorphingDialog {...props}/>;
}

function AdminMorphingDialog({ open, onClose, title, description, children, footer, wide = false, busy = false, placement = 'center', footerInModal = false, className = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const [closing, setClosing] = useState(false);
  const requestClose = () => { if (!busy) setClosing(true); };
  useLayoutEffect(() => {
    if (!open) return;
    const node = ref.current;
    const previousFocus = document.activeElement;
    node.showModal();
    node.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), .adm-dialog-header button')?.focus({ preventScroll: true });
    return () => { if (node.open) node.close(); if (previousFocus?.isConnected) previousFocus.focus?.(); };
  }, [open]);
  return createPortal(<dialog ref={ref} className="adm-application-layer adm-generic-dialog-layer" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} onCancel={event => { event.preventDefault(); requestClose(); }}>
    <MorphingModal viewId={open && !closing ? title : null} onClose={requestClose} onExitComplete={() => { if (closing) { setClosing(false); onClose(); } }} placement={placement} className={`adm-generic-modal ${wide ? 'adm-generic-wide' : ''} ${footerInModal ? 'adm-generic-footer-layout' : ''} ${className}`}
      header={<header className="adm-dialog-header"><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><Button type="button" variant="ghost" size="icon" aria-label="Close dialog" disabled={busy || closing} onClick={requestClose}><X size={20}/></Button></header>}>
      {footerInModal ? <><div className="adm-generic-scroll">{children}</div>{footer && <footer className="adm-dialog-actions adm-dialog-footer">{footer}</footer>}</> : children}
    </MorphingModal>
    {!footerInModal && footer && <footer className="adm-dialog-actions adm-dialog-footer">{footer}</footer>}
  </dialog>, document.body);
}

function NativeAdminDrawer({ open, onClose, title, description, children, footer, wide = false, busy = false, drawer = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open) { dialog.close(); return; }
    const previous = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={ref} className={`adm-dialog ${wide ? 'adm-dialog-wide' : ''} ${drawer ? 'adm-profile-drawer' : ''}`} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target !== event.currentTarget || busy) return; const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); }}>
    <header className="adm-dialog-header"><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><Button type="button" variant="ghost" size="icon" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></Button></header>
    {open && (drawer ? <div className="adm-dialog-body">{children}</div> : children)}
    {open && footer && <footer className="adm-dialog-actions adm-dialog-footer">{footer}</footer>}
  </dialog>;
}
