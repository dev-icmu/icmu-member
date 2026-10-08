import { ArrowUpRight, Mic2, Clapperboard, Flag } from 'lucide-react';
import { ButtonLink } from '../motion/button/base';
import SplitText from '../reactbits/SplitText';

const benefits = [
  { Icon: Clapperboard, title: 'Be part of the production team', text: 'Work with cameras, microphones and sound equipment. Help cover school and special events.', note: 'Production crew: grades 9 to 13, with a short interview.' },
  { Icon: Mic2, title: 'Learn through workshops and projects', text: 'Practise media skills with other members. Use what you learn in workshops, group projects and events.' },
  { Icon: Flag, title: 'Take part in media competitions', text: 'Join competitions within school and with other schools. Prepare with the team and represent Isipathana.' },
];

export function MemberBenefitsSection() {
  return <section className="pf-benefits" aria-labelledby="benefits-title">
    <div className="pf-container pf-benefits-inner">
      <div className="pf-benefits-heading"><span className="pf-label" data-reveal>YOUR PLACE IN THE UNIT</span><h2 id="benefits-title" className="pf-section-title"><SplitText text="What can you do" /><br/><SplitText text="as a member?" /></h2><p data-reveal>Try something new. Find a skill you enjoy. Work with people who share your interests.</p><ButtonLink href="/signup" className="pf-cta">Become a member <ArrowUpRight size={18}/></ButtonLink></div>
      <div className="pf-benefits-list">{benefits.map(({ Icon, title, text, note }, index) => <article key={title} data-reveal><span className="pf-benefit-icon"><Icon size={24} strokeWidth={1.3}/></span><div><span className="pf-label">0{index + 1}</span><h3>{title}</h3><p>{text}</p>{note && <small>{note}</small>}</div></article>)}</div>
    </div>
  </section>;
}