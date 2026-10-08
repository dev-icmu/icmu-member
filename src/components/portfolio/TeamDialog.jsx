import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X, ArrowUpRight } from 'lucide-react';
import { Button, ButtonLink } from '../motion/button/base';
import PortfolioMedia from './PortfolioMedia';

export default function TeamDialog({ team, onClose, onOpenChange }) {
  const dialog = useRef(null);
  const closing = useRef(false);
  const exit = useRef(null);
  const requestClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => { dialog.current?.close(); onClose(); };
    if (reduced) finish();
    else exit.current = gsap.to(dialog.current.querySelector('.pf-team-dialog-panel'), { opacity: 0, y: 12, duration: .18, ease: 'power2.out', onComplete: finish });
  }, [onClose]);

  useEffect(() => {
    if (!team) return;
    const node = dialog.current;
    closing.current = false;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const stableGutter = getComputedStyle(document.documentElement).scrollbarGutter.includes('stable');
    const scrollbarWidth = stableGutter ? 0 : window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth) document.body.style.paddingRight = `${scrollbarWidth}px`;
    onOpenChange(true);
    node.showModal();
    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo('.pf-team-dialog-panel', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .3, ease: 'power3.out' });
    }, node);
    return () => {
      exit.current?.kill();
      context.revert();
      node.close();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      onOpenChange(false);
    };
  }, [team, onOpenChange]);

  return <dialog ref={dialog} className="pf-team-dialog" aria-labelledby="team-dialog-title" aria-describedby="team-dialog-summary" data-lenis-prevent onCancel={event => { event.preventDefault(); requestClose(); }} onClick={event => { if (event.target === event.currentTarget) requestClose(); }}>
    {team && <div className="pf-team-dialog-panel">
      <Button type="button" className="pf-team-dialog-close" size="icon" variant="ghost" onClick={requestClose} aria-label="Close team details" autoFocus><X size={23}/></Button>
      <div className="pf-team-dialog-image"><PortfolioMedia src={team.image} alt={team.imageAlt} sizes="(max-width: 700px) 100vw, 40vw" priority /></div>
      <div className="pf-team-dialog-content">
        <p className="pf-label">EXPLORE THE TEAM</p>
        <h2 id="team-dialog-title">{team.name}</h2>
        <p id="team-dialog-summary" className="pf-team-dialog-summary">{team.description}</p>
        <h3>What you will do</h3>
        <ul>{team.activities.map(activity => <li key={activity}>{activity}</li>)}</ul>
        <p className="pf-team-dialog-fit">{team.suitability}</p>
        <p className="pf-team-dialog-note">You can learn with the team. You do not need to know everything before you start.</p>
        <ButtonLink href="/signup" className="pf-cta">Apply to join <ArrowUpRight size={18}/></ButtonLink>
      </div>
    </div>}
  </dialog>;
}

