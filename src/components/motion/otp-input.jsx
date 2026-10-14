"use client";
// Adapted from beui.dev/r/otp-input: retain animated slots with native text
// selection, mobile editing, accessible values and application autofill.
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

export function OTPInput({ length = 6, value: controlledValue, defaultValue = '', onChange, onComplete,
  label, hint, errorMessage, successMessage, status = 'idle', disabled = false, autoFocus = false,
  autoComplete = 'one-time-code', name, onBlur, normalizePaste, groups = [], mask = false,
  'aria-label': ariaLabel, className, placeholder = '' }) {
  const uid = useId();
  const reduce = useReducedMotion();
  const inputRef = useRef(null);
  const slotsRef = useRef(null);
  const [internal, setInternal] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const value = controlledValue ?? internal;
  const message = status === 'error' ? errorMessage : status === 'success' ? successMessage || hint : hint;

  useEffect(() => {
    if (status !== 'error' || reduce || !slotsRef.current) return;
    const animation = animate(slotsRef.current, { x: [0, -4, 4, -2, 2, 0] }, { duration: .3, ease: EASE_OUT });
    return () => animation.stop();
  }, [status, reduce]);

  function commit(raw, caret) {
    const next = raw.replace(/\D/g, '').slice(0, length);
    if (controlledValue === undefined) setInternal(next);
    onChange?.(next);
    setActive(Math.min(caret ?? next.length, length - 1));
    if (next.length === length && value.length !== length) onComplete?.(next);
  }

  return <div className={cn('beui-digits', className)} data-status={status} data-disabled={disabled || undefined}>
    {label && <label htmlFor={`${uid}-input`}>{label}</label>}
    <div className="beui-digits-field" onPointerDown={event => {
      if (disabled || event.pointerType === 'touch') return;
      const slots = Array.from(slotsRef.current?.children || []);
      const index = slots.findIndex(slot => event.clientX < slot.getBoundingClientRect().right);
      const caret = Math.min(index < 0 ? length : index, value.length);
      event.preventDefault(); inputRef.current?.focus(); inputRef.current?.setSelectionRange(caret, caret); setActive(Math.min(caret, length - 1));
    }}>
      <input ref={inputRef} id={`${uid}-input`} name={name} type="text" inputMode="numeric"
        autoComplete={autoComplete} autoFocus={autoFocus} disabled={disabled} value={value}
        style={{ opacity: 0, color: 'transparent', pointerEvents: disabled ? 'none' : undefined }}
        aria-label={ariaLabel || label || 'Digits'} aria-invalid={status === 'error'} aria-describedby={message ? `${uid}-hint` : undefined}
        onChange={event => commit(event.target.value, event.target.selectionStart)}
        onSelect={event => setActive(Math.min(event.currentTarget.selectionStart ?? 0, length - 1))}
        onPaste={event => {
          event.preventDefault();
          const raw = event.clipboardData.getData('text');
          const digits = (normalizePaste ? normalizePaste(raw) : raw).replace(/\D/g, '');
          const start = inputRef.current.selectionStart ?? 0;
          const end = inputRef.current.selectionEnd ?? start;
          commit(digits.length >= length ? digits : value.slice(0, start) + digits + value.slice(end), digits.length >= length ? length : start + digits.length);
        }}
        onFocus={() => setFocused(true)} onBlur={event => { setFocused(false); onBlur?.(event); }} />
      <div ref={slotsRef} className="beui-digit-slots" aria-hidden="true" style={{ '--digit-count': length }}>
        {Array.from({ length }, (_, index) => <div key={index} data-active={focused && index === active} data-gap={groups.includes(index) || undefined} data-filled={Boolean(value[index])} className="beui-digit-slot">
          {focused && index === active && <motion.span className="beui-digit-caret" animate={reduce ? undefined : { opacity: [1, 1, 0, 0] }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />}
          <AnimatePresence initial={false}>
            {!value[index] && !focused && <span className="beui-digit-placeholder">{placeholder[index] || ''}</span>}
            {value[index] && <motion.span className="beui-digit-value" key={value[index]}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }} transition={{ duration: reduce ? 0 : .16, ease: EASE_OUT }}>
              {mask ? '•' : value[index]}
            </motion.span>}
          </AnimatePresence>
        </div>)}
      </div>
    </div>
    {message && <p id={`${uid}-hint`} role={status === 'error' ? 'alert' : undefined}>{message}</p>}
  </div>;
}
