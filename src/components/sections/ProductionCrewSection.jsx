import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../motion/button/base';
import SplitText from '../reactbits/SplitText';
import PortfolioMedia from '../portfolio/PortfolioMedia';
import TeamDialog from '../portfolio/TeamDialog';
import { creativeTeams, productionScenes } from '../portfolio/content';

export function ProductionCrewSection({ onModalChange }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const closeTeam = useCallback(() => setSelectedTeam(null), []);
  return <section id="crew" className="pf-crew" aria-labelledby="crew-title">
    <div className="pf-crew-heading pf-container"><p className="pf-label" data-reveal>02 / OUR WORK</p><h2 id="crew-title" className="pf-section-title"><SplitText text="What we do." /></h2><p data-reveal>From the school stage to the editing desk, we help make it happen.</p></div>
    <div className="pf-production-sequence"><div className="pf-production-sticky">
      {productionScenes.map((scene, index) => <article className={`pf-production-scene pf-scene-${index}`} key={scene.id} aria-labelledby={`scene-${scene.id}`}><div className="pf-scene-media"><PortfolioMedia src={scene.image} video={scene.video} alt={scene.alt} className="pf-scene-photo" /></div><div className="pf-scene-shade" aria-hidden="true" /><div className="pf-scene-content pf-container"><div className="pf-scene-top"><span>ICMU / OUR WORK</span><span>0{index+1} / 03</span></div><div className="pf-scene-bottom"><div><p className="pf-label">{scene.label}</p><h3 id={`scene-${scene.id}`}>{scene.title}</h3></div><p>{scene.description}</p></div></div></article>)}
    </div></div>
    <div className="pf-crew-directory pf-container"><div className="pf-directory-heading" data-reveal><span className="pf-label">8 TEAMS. ONE UNIT.</span><p>Find your place.</p><p className="pf-directory-note">Explore each area and see what you can learn with the team.</p></div><div className="pf-skill-list">{creativeTeams.map((team, index) => <div className="pf-skill-entry" key={team.id} data-reveal><Button type="button" variant="ghost" pressScale={1} className="pf-skill-row" aria-haspopup="dialog" aria-label={`Learn about ${team.name}`} onClick={() => setSelectedTeam(team)}><span className="pf-skill-number">{String(index+1).padStart(2,'0')}</span><span className="pf-skill-name">{team.name}</span><span className="pf-skill-description">{team.description}</span><Plus size={24} strokeWidth={1.5}/></Button></div>)}</div></div>
    <TeamDialog team={selectedTeam} onClose={closeTeam} onOpenChange={onModalChange} />
  </section>;
}

