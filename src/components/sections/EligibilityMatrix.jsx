import { ArrowUpRight, Check } from 'lucide-react';
import { ButtonLink } from '../motion/button/base';
import SplitText from '../reactbits/SplitText';
import './landing-sections.css';

const membershipPaths = [
  { number: '01', title: 'General membership', grades: 'Grades 6 to 13', description: 'Join the school media team and start learning. You do not need previous media experience.', details: ['Free to join', 'Open to beginners'], link: '/signup', action: 'Become a member' },
  { number: '02', title: 'Production crew', grades: 'Grades 9 to 13', description: 'Work with cameras, sound equipment and live broadcasts. A short interview helps us get to know you.', details: ['A short interview', 'Equipment training with the team'], link: '#crew', action: 'Explore the teams' },
];
const steps = [
  ['Check your grade', 'Choose the membership option that matches your grade.'],
  ['Fill in the form', "Add your details, your parent or guardian's details and your relevant skills."],
  ['Send your application', 'The media unit will review your application after you submit it.'],
];

export function EligibilityMatrix() {
  return <section id="eligibility" className="pf-membership pf-container" aria-labelledby="membership-heading">
    <div className="pf-membership-heading"><span className="pf-label" data-reveal>03 / MEMBERSHIP</span><div><h2 id="membership-heading" className="pf-section-title"><SplitText text="How to join" /></h2><p className="pf-section-intro" data-reveal>For students at Isipathana College.</p></div></div>
    <div className="pf-membership-paths">{membershipPaths.map(path => <article className="pf-membership-row" key={path.number} data-reveal><span className="pf-path-number" aria-hidden="true">{path.number}</span><div className="pf-path-title"><span className="pf-grade-tag">{path.grades}</span><h3>{path.title}</h3></div><div className="pf-path-details"><p>{path.description}</p><ul>{path.details.map(detail => <li key={detail}><Check size={17} aria-hidden="true"/>{detail}</li>)}</ul><ButtonLink href={path.link} variant="ghost" className="pf-path-link">{path.action}<ArrowUpRight size={19} aria-hidden="true"/></ButtonLink></div></article>)}</div>
    <ol className="pf-join-steps">{steps.map(([title, body], index) => <li key={title} data-reveal><span className="pf-label">STEP {index+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
  </section>;
}

