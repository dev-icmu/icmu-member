import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AdaptiveStepper, AdaptiveStepperDecrement, AdaptiveStepperIncrement, AdaptiveStepperValue } from '@/components/motion/adaptive-stepper';
import { Loader } from '@/components/motion/loader';
import { NumberTicker } from '@/components/motion/number-ticker';

export function AdminLoading({ children = 'Loading records...' }) {
  return <span className="adm-loading"><Loader variant="spinner" size={18} label={children}/><span aria-hidden="true">{children}</span></span>;
}

export function AdminNumber({ value }) {
  return <NumberTicker value={Number(value)} duration={0.22} stagger={0} startOnView={false} blur={false} locale className="adm-number"/>;
}

export function AdminPagination({ page, pages, busy, onChange }) {
  return <AdaptiveStepper value={page} min={1} max={Math.max(page, pages)} onValueChange={onChange} disabled={busy} aria-label="Table page" formatValueText={value => `Page ${value} of ${pages}`} className="adm-page-stepper">
    <AdaptiveStepperDecrement aria-label="Previous page"><ArrowLeft size={17}/></AdaptiveStepperDecrement>
    <AdaptiveStepperValue>{value => `${value} / ${pages}`}</AdaptiveStepperValue>
    <AdaptiveStepperIncrement aria-label="Next page"><ArrowRight size={17}/></AdaptiveStepperIncrement>
  </AdaptiveStepper>;
}
