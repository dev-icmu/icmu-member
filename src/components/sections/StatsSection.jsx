import SplitText from '../reactbits/SplitText';
import { ArrowDownRight } from 'lucide-react';

export function StatsSection() {
  return <section id="about" className="pf-about pf-container" aria-labelledby="about-title">
    <div className="pf-about-heading"><span className="pf-label" data-reveal>01 / GET TO KNOW US</span><ArrowDownRight size={32} strokeWidth={1} data-reveal/></div>
    <div className="pf-about-body">
      <div><h2 id="about-title"><SplitText text="What is ICMU?" /></h2><p className="pf-about-definition" data-reveal>Isipathana College Media Unit.<br />Our school's student media team.</p></div>
      <div className="pf-about-aside" data-reveal><p>We run sound systems, announce at school events, design graphics, film and edit videos, and help manage events.</p><p>Members learn together through workshops, projects, special events and media competitions. You can start as a beginner.</p><a href="#crew" className="pf-text-link">See what we do <ArrowDownRight size={18}/></a></div>
    </div>
    <div className="pf-facts" data-reveal><div><strong>08</strong><span>Teams to explore</span></div><div><strong>6<span>to</span>13</strong><span>Grades welcome</span></div><div><strong>Free</strong><span>General membership</span></div><div className="pf-facts-note"><p>Learn together.<br />Create for your school.</p></div></div>
  </section>;
}