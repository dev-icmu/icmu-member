import { ArrowUpRight } from 'lucide-react';
import PortfolioMedia from '../portfolio/PortfolioMedia';
import { portfolioImages } from '../portfolio/content';

const disciplines = ['News reading', 'Photography', 'Radio drama', 'Short films'];

export function CompetitionNetworkSection() {
  return (
    <section id="competition" className="pf-competition" aria-labelledby="competition-heading">
      <div className="pf-competition-scene">
        <div className="pf-competition-media" data-media-reveal>
          <PortfolioMedia src={portfolioImages.competition} alt="A media event audience, placeholder photograph" className="pf-competition-image" />
        </div>
        <div className="pf-competition-shade" aria-hidden="true" />
        <div className="pf-container pf-competition-overlay">
          <span className="pf-label" data-reveal>04 / Beyond the school gates</span>
          <h2 id="competition-heading" data-reveal>Represent<br /><span>the green.</span></h2>
          <span className="pf-competition-caption">SCHOOL MEDIA FESTIVALS / SRI LANKA</span>
        </div>
      </div>
      <div className="pf-container pf-competition-details">
        <div className="pf-competition-copy">
          <p className="pf-competition-lead" data-reveal>Take your work to school media competitions and festivals across Sri Lanka.</p>
          <p className="pf-competition-note" data-reveal>Practise with other members, take part in competitions within school, and prepare to represent Isipathana at events with other schools.</p>
        </div>
        <ol className="pf-discipline-list">
          {disciplines.map((discipline, index) => (
            <li key={discipline} data-reveal>
              <span className="pf-discipline-number">0{index + 1}</span>
              <span>{discipline}</span>
              <ArrowUpRight size={22} strokeWidth={1.2} aria-hidden="true" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
