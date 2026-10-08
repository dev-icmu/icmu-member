import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import IcmuLogo from './IcmuLogo';

export default function LogoPreloader({ onReveal, onComplete }) {
  const ref = useRef(null);
  useGSAP((context, contextSafe) => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const abort = new AbortController();
    const timers = [];
    let disposed = false;
    let closing = false;
    let frame;
    const delay = duration => new Promise(resolve => timers.push(window.setTimeout(resolve, duration)));
    const finish = () => { if (!disposed) onComplete(); };
    const reveal = contextSafe(() => {
      if (disposed || closing) return;
      closing = true;
      onReveal();
      frame = requestAnimationFrame(contextSafe(() => {
        if (disposed) return;
        if (motion.matches) { finish(); return; }
        const mark = ref.current.querySelector('.pf-loader-mark');
        const destination = ref.current.parentElement.querySelector('.pf-hero-logo');
        const from = mark.getBoundingClientRect();
        const to = destination.getBoundingClientRect();
        gsap.timeline({ onComplete: finish })
          .to('.pf-preloader-curtain', { opacity: 0, duration: .75, ease: 'power2.inOut' }, 0)
          .to('.pf-loader-caption', { opacity: 0, y: -8, duration: .2 }, 0)
          .to(mark, { x: to.left + to.width / 2 - from.left - from.width / 2, y: to.top + to.height / 2 - from.top - from.height / 2, scale: to.width / from.width, duration: .8, ease: 'power3.inOut' }, 0);
      }));
    });
    const mark = ref.current.querySelector('.pf-loader-mark');
    const strokes = [...ref.current.querySelectorAll('.pf-loader-drawing path[stroke]')];
    // Real path lengths avoid rounding a normalized 1px dash to 0px.
    strokes.forEach(path => {
      const length = path.getTotalLength() + 1;
      gsap.set(path, { strokeDasharray: `${length} ${length}`, strokeDashoffset: length, autoRound: false });
    });
    if (motion.matches) {
      gsap.set('.pf-loader-mark, .pf-loader-caption, .pf-loader-drawing path:not([stroke])', { opacity: 1, clearProps: 'transform' });
      gsap.set(strokes, { strokeDashoffset: 0, clearProps: 'strokeDasharray,strokeDashoffset' });
    } else {
      const intro = gsap.timeline();
      intro.fromTo(mark, { opacity: 0, scale: .72 }, { opacity: 1, scale: 1, duration: .55, ease: 'back.out(1.5)' }, 0)
        .fromTo('.pf-loader-caption', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .3, ease: 'power2.out' }, .24)
        .to(strokes, { strokeDashoffset: 0, duration: 1.05, stagger: .012, ease: 'power2.inOut', autoRound: false }, .18)
        .fromTo('.pf-loader-drawing path:not([stroke])', { opacity: 0 }, { opacity: 1, duration: .35 }, .8);
    }
    const images = [...ref.current.parentElement.querySelectorAll('.pf-hero img')];
    const loaded = images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true, signal: abort.signal });
      img.addEventListener('error', resolve, { once: true, signal: abort.signal });
    }));
    Promise.all([delay(motion.matches ? 100 : 1900), Promise.race([Promise.all([document.fonts.ready, ...loaded]), delay(2000)])]).then(reveal);
    motion.addEventListener('change', reveal);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      abort.abort();
      motion.removeEventListener('change', reveal);
      document.body.style.overflow = previousOverflow;
    };
  }, { scope: ref, dependencies: [onReveal, onComplete] });
  return <div className="pf-preloader" ref={ref} role="status" aria-live="polite">
    <div className="pf-preloader-curtain" />
    <div className="pf-loader-mark"><IcmuLogo className="pf-loader-logo pf-loader-trace" /><IcmuLogo className="pf-loader-logo pf-loader-drawing" /></div>
    <span className="pf-loader-caption">Isipathana College Media Unit</span><span className="pf-sr-only">Opening ICMU</span>
  </div>;
}
