import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '../motion/button/base';

export default function PortfolioMedia({ src = '', video = '', alt = '', className = '', priority = false, sizes = '100vw' }) {
  const responsiveSources = src.startsWith('https://images.pexels.com/')
    ? [480, 800, 1400].map(width => `${src.replace(/([?&])w=\d+/, '$1w=' + width)} ${width}w`).join(', ')
    : undefined;
  const root = useRef(null);
  const player = useRef(null);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    const node = player.current;
    if (!node || !video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scene = root.current.closest('.pf-production-scene');
    let visible = false;
    let active = true;
    const sync = () => {
      if (!active) return;
      if (visible && scene?.dataset.mediaActive !== 'false' && !motion.matches && !paused && !document.hidden) {
        if (!node.getAttribute('src')) { node.src = video; node.load(); }
        node.play().catch(() => { if (active) setPlaying(false); });
      } else node.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .15 });
    observer.observe(root.current);
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    scene?.addEventListener('portfolio-scenechange', sync);
    return () => {
      active = false;
      observer.disconnect();
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      scene?.removeEventListener('portfolio-scenechange', sync);
      node.pause();
    };
  }, [video, paused]);

  const togglePlayback = () => {
    const node = player.current;
    if (!node) return;
    if (playing) { setPaused(true); node.pause(); }
    else {
      setPaused(false);
      if (!node.getAttribute('src')) { node.src = video; node.load(); }
      node.play().catch(() => setPlaying(false));
    }
  };

  return <div className={`pf-media ${className}`} ref={root}>
    <div className="pf-media-surface">
      {src && !failed ? <img src={src} srcSet={responsiveSources} sizes={responsiveSources ? sizes : undefined} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => setFailed(true)} /> : <div className="pf-media-fallback" role="img" aria-label={alt || 'Production image placeholder'}><span>ICMU / IN PRODUCTION</span></div>}
      {video && <video ref={player} muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1} onPlaying={() => { setPlaying(true); setHasFrame(true); }} onPause={() => setPlaying(false)} onError={() => { setVideoFailed(true); setPlaying(false); setHasFrame(false); }} className={hasFrame ? 'has-frame' : ''} />}
    </div>
    {video && !videoFailed && <Button type="button" variant="ghost" size="icon" className="pf-video-toggle" onClick={togglePlayback} aria-label={playing ? 'Pause background video' : 'Play background video'}>{playing ? <Pause size={16} /> : <Play size={16} />}</Button>}
  </div>;
}

