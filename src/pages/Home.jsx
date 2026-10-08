import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Navbar } from '../components/layout/Navbar';
import { HeroSection } from '../components/hero/HeroSection';
import { StatsSection } from '../components/sections/StatsSection';
import { MemberBenefitsSection } from '../components/sections/MemberBenefitsSection';
import { EligibilityMatrix } from '../components/sections/EligibilityMatrix';
import { ProductionCrewSection } from '../components/sections/ProductionCrewSection';
import { CompetitionNetworkSection } from '../components/sections/CompetitionNetworkSection';
import { CtaBannerSection } from '../components/sections/CtaBannerSection';
import { Footer } from '../components/layout/Footer';
import LogoPreloader from '../components/portfolio/LogoPreloader';
import './portfolio.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);
let introPlayed = false;

export default function Home() {
  const root = useRef(null);
  const smoothScroll = useRef(null);
  const modalOpen = useRef(false);
  const [intro, setIntro] = useState(() => introPlayed || !!window.location.hash || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'complete' : 'loading');
  const ready = intro === 'complete';
  const revealed = intro !== 'loading';
  const introComplete = useRef(ready);
  const handleModalChange = useCallback(open => {
    modalOpen.current = open;
    if (open) smoothScroll.current?.stop();
    else if (introComplete.current) smoothScroll.current?.start();
  }, []);
  const revealIntro = useCallback(() => setIntro('revealing'), []);
  const finishIntro = useCallback(() => {
    introPlayed = true;
    introComplete.current = true;
    setIntro('complete');
    if (!modalOpen.current) smoothScroll.current?.start();
  }, []);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      ScrollTrigger.refresh();
      if (window.location.hash) {
        try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); } catch { /* Keep the page position for an invalid fragment. */ }
      }
    });
    return () => { live = false; };
  }, [ready]);

  useGSAP(() => {
    if (!revealed) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const lenis = new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false, anchors: true });
      smoothScroll.current = lenis;
      if (modalOpen.current || !introComplete.current) lenis.stop();
      const tick = time => lenis.raf(time * 1000);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      root.current.querySelectorAll('[data-reveal]').forEach(node => {
        gsap.fromTo(node, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .75, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: node, start: 'top 94%', once: true } });
      });
      gsap.from('[data-hero-reveal]', { opacity: 0, y: 16, duration: .9, stagger: .07, ease: 'power3.out', clearProps: 'transform,opacity' });
      gsap.from('.pf-hero-images', { scale: 1.04, opacity: 0, duration: 1.2, ease: 'power3.out', clearProps: 'transform,opacity' });
      const heroStage = root.current.querySelector('.pf-hero-stage');
      const heroDepth = [...root.current.querySelectorAll('[data-hero-depth]')].map(node => ({
        node,
        x: gsap.quickTo(node, 'x', { duration: .8, ease: 'power3.out' }),
        y: gsap.quickTo(node, 'y', { duration: .8, ease: 'power3.out' }),
        depth: Number(node.dataset.heroDepth) || 0,
      }));
      const finePointer = window.matchMedia('(pointer: fine)').matches;
      const moveHero = event => {
        if (!finePointer || !heroStage) return;
        const rect = heroStage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        heroDepth.forEach(item => { item.x(x * item.depth); item.y(y * item.depth * .65); });
      };
      const resetHero = () => heroDepth.forEach(item => { item.x(0); item.y(0); });
      heroStage?.addEventListener('pointermove', moveHero, { passive: true });
      heroStage?.addEventListener('pointerleave', resetHero, { passive: true });
      root.current.querySelectorAll('[data-hero-parallax]').forEach(node => {
        gsap.to(node, { y: Number(node.dataset.heroParallax), opacity: 0, ease: 'none', scrollTrigger: { trigger: '.pf-hero', start: 'top top', end: 'bottom top', scrub: 1 } });
      });
      gsap.to('.pf-hero-logo-wrap', { yPercent: -6, opacity: .1, ease: 'none', scrollTrigger: { trigger: '.pf-hero', start: 'top top', end: 'bottom top', scrub: 1 } });
      root.current.querySelectorAll('[data-media-reveal]').forEach(node => {
        gsap.fromTo(node, { clipPath: 'inset(13% 14% 13% 14%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: node.parentElement, start: 'top 85%', end: 'top 5%', scrub: .8 } });
        const image = node.querySelector('.pf-media-surface');
        if (image) gsap.fromTo(image, { scale: 1.06 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: node.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 } });
      });
      gsap.to('.pf-scroll-progress', { scaleX: 1, transformOrigin: 'left', ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true } });
      let live = true;
      document.fonts.ready.then(() => { if (live) { lenis.resize(); ScrollTrigger.refresh(); } });
      return () => { live = false; heroStage?.removeEventListener('pointermove', moveHero); heroStage?.removeEventListener('pointerleave', resetHero); resetHero(); gsap.ticker.remove(tick); lenis.destroy(); if (smoothScroll.current === lenis) smoothScroll.current = null; };
    });

    media.add('(min-width: 900px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)', () => {
      const sequence = root.current.querySelector('.pf-production-sequence');
      const scenes = [...sequence.querySelectorAll('.pf-production-scene')];
      sequence.classList.add('is-scroll-driven');
      gsap.set(scenes.slice(1), { autoAlpha: 0, yPercent: 3 });
      const timeline = gsap.timeline({ scrollTrigger: { trigger: sequence, start: 'top top', end: 'bottom bottom', scrub: .65, invalidateOnRefresh: true } });
      scenes.forEach((scene, index) => {
        const start = index === 0 ? 0 : index === 1 ? .85 : 2.05;
        if (index) {
          timeline.to(scenes[index - 1], { autoAlpha: 0, duration: .6, ease: 'sine.inOut' }, start);
          timeline.to(scene, { autoAlpha: 1, yPercent: 0, duration: .65, ease: 'sine.inOut' }, start);
          timeline.to(scenes[index - 1].querySelector('.pf-scene-bottom'), { opacity: 0, duration: .2 }, start);
          timeline.fromTo(scene.querySelector('.pf-scene-bottom'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: 'power2.out' }, start + .25);
        }
        timeline.fromTo(scene.querySelector('.pf-media-surface'), { scale: 1.055 }, { scale: 1, duration: 1.45, ease: 'none' }, start);
      });
      const footer = root.current.querySelector('.pf-footer-reveal');
      gsap.fromTo('.pf-motto-first', { xPercent: -12 }, { xPercent: 1, ease: 'none', scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
      gsap.fromTo('.pf-motto-second', { xPercent: 12 }, { xPercent: -1, ease: 'none', scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
      let currentScene = -1;
      const updateActiveScene = () => {
        const next = timeline.time() < 1.15 ? 0 : timeline.time() < 2.35 ? 1 : 2;
        if (next === currentScene) return;
        currentScene = next;
        scenes.forEach((scene, index) => {
          scene.inert = index !== next;
          scene.dataset.mediaActive = String(index === next);
          scene.dispatchEvent(new Event('portfolio-scenechange'));
        });
      };
      timeline.eventCallback('onUpdate', updateActiveScene);
      updateActiveScene();
      return () => {
        sequence.classList.remove('is-scroll-driven');
        scenes.forEach(scene => {
          scene.inert = false;
          delete scene.dataset.mediaActive;
          scene.dispatchEvent(new Event('portfolio-scenechange'));
        });
      };
    });

    media.add('(max-width: 899px) and (prefers-reduced-motion: no-preference), (max-height: 649px) and (prefers-reduced-motion: no-preference)', () => {
      root.current.querySelectorAll('.pf-production-scene').forEach(scene => {
        gsap.fromTo(scene.querySelector('.pf-media-surface'), { yPercent: -3, scale: 1.07 }, { yPercent: 3, scale: 1.07, ease: 'none', scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: .7 } });
      });
    });
    return () => media.revert();
  }, { scope: root, dependencies: [revealed], revertOnUpdate: true });

  return <MotionConfig reducedMotion="user"><div className="portfolio-page" ref={root}>
    {!ready && <LogoPreloader onReveal={revealIntro} onComplete={finishIntro} />}
    <div inert={!ready} className="pf-page-content" data-ready={ready} data-revealed={revealed}>
      <a href="#main-content" className="pf-skip-link">Skip to content</a>
      <div className="pf-scroll-progress" aria-hidden="true" />
      <Navbar />
      <main id="main-content"><HeroSection ready={revealed} /><StatsSection /><ProductionCrewSection onModalChange={handleModalChange} /><MemberBenefitsSection /><EligibilityMatrix /><CompetitionNetworkSection /><CtaBannerSection /></main>
      <Footer />
    </div>
  </div></MotionConfig>;
}
