/* Adapted from React Bits SplitText by David Haz.
 * Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/TextAnimations/SplitText/SplitText.jsx
 * See LICENSE.reactbits.md. Adds scoped cleanup and reduced-motion support.
 */
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

export default function SplitText({ text, className = '', tag: Tag = 'span', delay = 30, duration = 1.05, start = 'top 92%', scrub = false, enabled = true }) {
  const ref = useRef(null);
  useGSAP((context, contextSafe) => {
    if (!enabled) return;
    let disposed = false;
    let media;
    const setup = contextSafe(() => {
      if (disposed || !ref.current) return;
      media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const split = GSAPSplitText.create(ref.current, {
          type: 'words,chars', wordsClass: 'pf-split-word', charsClass: 'pf-split-char',
          aria: 'auto', smartWrap: true, autoSplit: true,
          onSplit(self) {
            return gsap.fromTo(self.chars,
              scrub ? { opacity: 0.2 } : { yPercent: 105, rotate: 3, opacity: 0 },
              { yPercent: 0, rotate: 0, opacity: 1, duration, ease: 'power4.out', stagger: delay / 1000,
                scrollTrigger: { trigger: ref.current, start, end: scrub ? 'bottom 48%' : undefined, scrub: scrub ? 0.7 : false, once: !scrub },
              });
          },
        });
        return () => split.revert();
      });
    });
    document.fonts.ready.then(setup);
    return () => { disposed = true; media?.revert(); };
  }, { scope: ref, dependencies: [text, delay, duration, start, scrub, enabled], revertOnUpdate: true });
  return <Tag ref={ref} className={`pf-split ${className}`}>{text}</Tag>;
}


