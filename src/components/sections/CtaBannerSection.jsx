import { ArrowUpRight } from 'lucide-react';
import { ButtonLink } from '../motion/button/base';

export function CtaBannerSection() {
  return (
    <section className="pf-join-section" aria-labelledby="join-heading">
      <div className="pf-container">
        <div className="pf-join-topline" data-reveal>
          <span className="pf-label">ISIPATHANA COLLEGE MEDIA UNIT</span>
          <span>GRADES 6 TO 13 / FREE TO JOIN</span>
        </div>
        <h2 id="join-heading" className="pf-join-title" data-reveal>Join the<br /><span>media unit.</span></h2>
        <div className="pf-join-bottom" data-reveal>
          <p>For Isipathana students.<br />No experience needed.</p>
          <ButtonLink href="/signup" size="lg" className="pf-join-link">
            <span>Become a member</span>
            <ArrowUpRight strokeWidth={1.1} aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
