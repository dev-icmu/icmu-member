import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import IcmuLogo from '../portfolio/IcmuLogo';

export function Footer() {
  return <div className="pf-footer-reveal"><footer className="pf-footer">
    <div className="pf-container pf-footer-top">
      <a className="pf-footer-brand" href="#home" aria-label="Isipathana College Media Unit, back to top"><IcmuLogo className="pf-footer-logo"/><span>ISIPATHANA COLLEGE<br/>MEDIA UNIT<small>Colombo 05, Sri Lanka</small></span></a>
      <nav className="pf-footer-nav" aria-label="Footer navigation"><a href="#crew">Our work <ArrowUpRight size={16}/></a><a href="#eligibility">Become a member <ArrowUpRight size={16}/></a><a href="#competition">Competitions <ArrowUpRight size={16}/></a><Link to="/login">Member login <ArrowUpRight size={16}/></Link></nav>
    </div>
    <div className="pf-motto-wrap"><p className="pf-footer-motto" aria-label="No sacrifice. No victory."><span className="pf-motto-first" aria-hidden="true">No sacrifice.</span><span className="pf-motto-second" aria-hidden="true">No victory.</span></p></div>
    <div className="pf-container pf-footer-bottom"><span>© {new Date().getFullYear()} Isipathana College Media Unit</span><span>GREEN &amp; GREEN AIRWAVES</span><a href="#home">BACK TO TOP <ArrowUpRight size={16}/></a></div>
  </footer></div>;
}