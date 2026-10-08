import { ArrowUpRight, ArrowDown } from 'lucide-react';
import { ButtonLink } from '../motion/button/base';
import SplitText from '../reactbits/SplitText';
import IcmuLogo from '../portfolio/IcmuLogo';
import PortfolioMedia from '../portfolio/PortfolioMedia';
import { portfolioImages } from '../portfolio/content';
import DriftWall from '../DriftWall';

const driftItems = [
  [portfolioImages.heroMain, 'Camera production'],
  [portfolioImages.heroSecondary, 'Video editing'],
  [portfolioImages.competition, 'School media event'],
  [portfolioImages.heroMain, 'Production team'],
  [portfolioImages.heroSecondary, 'Creative work'],
  [portfolioImages.competition, 'Live event'],
].map(([image, title]) => ({ image, title }));

export function HeroSection({ ready }) {
  return <section id="home" className="pf-hero" aria-labelledby="hero-title">
    <div className="pf-hero-stage">
      <div className="pf-hero-images" aria-hidden="true">
        <div className="pf-hero-drift" data-hero-depth="-8"><DriftWall items={driftItems} columns={4} tileWidth={220} tileHeight={150} gap={18} radius={10} tilt={8} turn={-10} depth={80} speed={18} parallax={0.2} fade={0.7} dim={0.42} grayscale overlayColor="#050706" /></div>
        <div className="pf-hero-plane pf-plane-camera" data-hero-depth="-18" data-hero-parallax="-45"><PortfolioMedia sizes="(max-width: 620px) 70vw, 40vw" src={portfolioImages.heroMain} priority /></div>
        <div className="pf-hero-plane pf-plane-edit" data-hero-depth="24" data-hero-parallax="35"><PortfolioMedia sizes="(max-width: 620px) 70vw, 40vw" src={portfolioImages.heroSecondary} priority /></div>
      </div>
      <div className="pf-hero-shade" aria-hidden="true" />
      <div className="pf-hero-composition pf-container">
        <div className="pf-hero-side pf-hero-side-left" data-hero-reveal><span className="pf-label">BE PART OF</span><p>The legacy.</p><ButtonLink href="/signup" className="pf-cta">Become a member <ArrowUpRight size={18}/></ButtonLink></div>
        <div className="pf-hero-center">
          <p className="pf-hero-overline" data-hero-reveal>GREEN & GREEN AIRWAVES</p>
          <div className="pf-hero-logo-wrap" data-hero-depth="9"><IcmuLogo className="pf-hero-logo" /></div>
          <span className="pf-hero-logo-caption" data-hero-reveal>Isipathana College Media Unit</span>
        </div>
        <div className="pf-hero-side pf-hero-side-right" data-hero-reveal><p>Learn to film, design,<br />write and present.</p><span>Help share life at Isipathana.</span><a href="#about" className="pf-text-link">Meet ICMU <ArrowDown size={17}/></a></div>
      </div>
      <div className="pf-hero-title-wrap pf-container">
        <h1 id="hero-title"><SplitText text="BEHIND THE LENS." enabled={ready} delay={18} /></h1>
        <div className="pf-hero-baseline" data-hero-reveal><a href="#about" className="pf-scroll-link"><ArrowDown size={17} /> EXPLORE THE UNIT</a><span>FOR ISIPATHANA STUDENTS, GRADES 6 TO 13</span><a href="/login" className="pf-text-link">Member login <ArrowUpRight size={16} /></a></div>
      </div>
      <ButtonLink href="/signup" className="pf-cta pf-mobile-hero-cta">Become a member <ArrowUpRight size={18}/></ButtonLink>
    </div>
  </section>;
}

