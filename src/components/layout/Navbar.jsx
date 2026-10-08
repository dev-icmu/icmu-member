import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Button, ButtonLink } from '../motion/button/base';
import IcmuLogo from '../portfolio/IcmuLogo';

const links = [['Home', '#home'], ['Our work', '#crew'], ['Join ICMU', '#eligibility'], ['Competitions', '#competition']];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const header = useRef(null);
  const toggle = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = event => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    const closeOutside = event => { if (!header.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', closeOutside);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', closeOutside); };
  }, [open]);
  return <header className="pf-header" ref={header}>
    <div className="pf-header-inner pf-container"><a href="#home" className="pf-brand" onClick={()=>setOpen(false)} aria-label="Isipathana College Media Unit home"><IcmuLogo className="pf-brand-mark"/><span>ISIPATHANA COLLEGE<small>MEDIA UNIT</small></span></a>
      <nav className="pf-desktop-nav" aria-label="Main navigation">{links.map(([label,href])=><a key={href} href={href} className="pf-nav-link"><span>{label}</span><span aria-hidden="true">{label}</span></a>)}</nav>
      <ButtonLink className="pf-cta pf-header-cta" href="/signup">Be a member <ArrowUpRight size={16}/></ButtonLink>
      <Button type="button" ref={toggle} className="pf-menu-toggle" variant="ghost" size="icon" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="portfolio-menu" onClick={()=>setOpen(v=>!v)}>{open?<X size={23}/>:<Menu size={23}/>}</Button>
    </div>
    {open&&<nav id="portfolio-menu" className="pf-mobile-nav" aria-label="Mobile navigation">{links.map(([label,href],i)=><a key={href} href={href} onClick={()=>setOpen(false)}><span>0{i+1}</span>{label}<ArrowUpRight size={20}/></a>)}<div><ButtonLink href="/signup" className="pf-cta">Be a member <ArrowUpRight size={16}/></ButtonLink><a href="/login" className="pf-text-link">Member login</a></div></nav>}
  </header>;
}


