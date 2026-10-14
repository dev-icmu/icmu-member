"use client";;
// beui.dev/components/motion/adaptive-stepper

import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EASE_OUT,
  SPRING_PRESS,
} from "@/lib/ease";
import { Liquid, LiquidItem } from "@/components/motion/liquid";
import { cn } from "@/lib/utils";

// Quick page changes; use the shared easing without an elastic overshoot.
const STEPPER_LIQUID_TRANSITION = {
  duration: 220,
  ease: EASE_OUT
};

const AdaptiveStepperContext = createContext(null);

function useAdaptiveStepperContext(component) {
  const context = useContext(AdaptiveStepperContext);
  if (!context) {
    throw new Error(`${component} must be used within <AdaptiveStepper>`);
  }
  return context;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanNumber(value) {
  return Number(value.toFixed(10));
}

function nextStep(
  value,
  direction,
  min,
  max,
  step,
) {
  if (direction === 1) {
    const nextIndex = Math.floor((value - min) / step + 1e-10) + 1;
    return cleanNumber(Math.min(max, min + nextIndex * step));
  }

  const previousIndex = Math.ceil((value - min) / step - 1e-10) - 1;
  return cleanNumber(Math.max(min, min + previousIndex * step));
}

function mergeRefs(...refs) {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref && typeof ref === "object") {
        (ref).current = node;
      }
    }
  };
}

export function AdaptiveStepper({
  children,
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  min = 0,
  max = 10,
  step = 1,
  disabled = false,
  name,
  formatValueText,
  className,
  "aria-label": ariaLabel = "Quantity"
}) {
  const reduce = useReducedMotion() ?? false;
  const labelId = useId();
  const decrementRef = useRef(null);
  const incrementRef = useRef(null);
  const lower = Number.isFinite(min) ? min : 0;
  const suppliedMax = Number.isFinite(max) ? max : lower;
  const upper = suppliedMax > lower ? suppliedMax : lower;
  const stride = Number.isFinite(step) && step > 0 ? step : 1;
  const [internalValue, setInternalValue] = useState(() =>
    clamp(Number.isFinite(defaultValue) ? defaultValue : lower, lower, upper));
  const controlled = controlledValue !== undefined;
  const suppliedValue = controlled ? controlledValue : internalValue;
  const currentValue = clamp(Number.isFinite(suppliedValue) ? suppliedValue : lower, lower, upper);
  const [previousValue, setPreviousValue] = useState(currentValue);
  const [direction, setDirection] = useState(0);
  const currentValueRef = useRef(currentValue);
  if (currentValue !== previousValue) {
    setDirection(currentValue > previousValue ? 1 : -1);
    setPreviousValue(currentValue);
  }

  useLayoutEffect(() => {
    currentValueRef.current = currentValue;
  }, [currentValue]);

  const commit = useCallback((nextValue, restoreFocus) => {
    const next = clamp(cleanNumber(nextValue), lower, upper);
    if (next === currentValue) return;
    if (!controlled) setInternalValue(next);
    onValueChange?.(next);

    if (!restoreFocus) return;
    requestAnimationFrame(() => {
      if (next === upper && currentValueRef.current === upper) {
        decrementRef.current?.focus();
      } else if (next === lower && currentValueRef.current === lower) {
        incrementRef.current?.focus();
      }
    });
  }, [controlled, currentValue, lower, onValueChange, upper]);

  const decrement = useCallback((restoreFocus) => {
    if (disabled || currentValue <= lower) return;
    commit(nextStep(currentValue, -1, lower, upper, stride), restoreFocus);
  }, [commit, currentValue, disabled, lower, stride, upper]);

  const increment = useCallback((restoreFocus) => {
    if (disabled || currentValue >= upper) return;
    commit(nextStep(currentValue, 1, lower, upper, stride), restoreFocus);
  }, [commit, currentValue, disabled, lower, stride, upper]);

  const valueText = formatValueText?.(currentValue) ?? String(currentValue);
  const context = useMemo(() => ({
    value: currentValue,
    valueText,
    direction,
    atMin: currentValue <= lower,
    atMax: currentValue >= upper,
    disabled,
    reduce,
    decrement,
    increment,
    decrementRef,
    incrementRef,
  }), [
    currentValue,
    decrement,
    direction,
    disabled,
    increment,
    lower,
    reduce,
    upper,
    valueText,
  ]);

  return (
    <AdaptiveStepperContext.Provider value={context}>
      <fieldset
        disabled={disabled}
        className={cn(
          "relative isolate m-0 inline-block h-12 w-[13.5rem] border-0 p-0",
          className
        )}>
        <legend id={labelId} className="sr-only">
          {ariaLabel}. Current value: {valueText}
        </legend>
        <Liquid blur={8} contrast={22} fill="var(--background)" className="size-full">
          {children}
        </Liquid>
        {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      </fieldset>
    </AdaptiveStepperContext.Provider>
  );
}

function StepperAction({
  direction,
  children,
  className,
  onClick,
  ref,
  style,
  tabIndex,
  "aria-label": ariaLabel,
  ...props
}) {
  const context = useAdaptiveStepperContext("AdaptiveStepper action");
  const hidden = direction === -1 ? context.atMin : context.atMax;
  const actionRef =
    direction === -1 ? context.decrementRef : context.incrementRef;
  const label =
    ariaLabel ?? (direction === -1 ? "Decrease value" : "Increase value");
  const action = direction === -1 ? context.decrement : context.increment;
  const x =
    direction === -1
      ? hidden
        ? 32
        : 0
      : hidden
        ? 136
        : 168;

  return (
    <LiquidItem
      x={x}
      y={0}
      width={48}
      height={48}
      radius={24}
      transition={STEPPER_LIQUID_TRANSITION}>
      <motion.button
        {...props}
        ref={mergeRefs(ref, actionRef)}
        type="button"
        aria-label={label}
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : tabIndex}
        disabled={context.disabled || hidden}
        whileTap={
          context.reduce || context.disabled || hidden
            ? undefined
            : { scale: 0.94 }
        }
        transition={context.reduce ? { duration: 0 } : SPRING_PRESS}
        style={style}
        className={cn(
          "grid size-full place-items-center rounded-full border border-transparent bg-transparent bg-clip-padding text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
          hidden && "hover:bg-transparent",
          context.disabled && "opacity-50",
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) action(event.detail === 0);
        }}>
        <motion.span
          aria-hidden="true"
          initial={{
            opacity: hidden ? 0 : 1,
            filter: hidden ? "blur(2px)" : "blur(0px)",
          }}
          animate={{
            opacity: hidden ? 0 : 1,
            filter: hidden ? "blur(2px)" : "blur(0px)",
          }}
          transition={{ duration: context.reduce ? 0 : 0.15, ease: EASE_OUT }}>
          {children ??
            (direction === -1 ? (
              <Minus className="size-5" strokeWidth={2.5} />
            ) : (
              <Plus className="size-5" strokeWidth={2.5} />
            ))}
        </motion.span>
      </motion.button>
    </LiquidItem>
  );
}

export function AdaptiveStepperDecrement(props) {
  return <StepperAction {...props} direction={-1} />;
}

export function AdaptiveStepperValue({
  children,
  className,
  style,
  ...props
}) {
  const context = useAdaptiveStepperContext("AdaptiveStepperValue");
  const geometry =
    context.atMin && context.atMax
      ? { x: 0, width: 216 }
      : context.atMin
        ? { x: 0, width: 152 }
        : context.atMax
          ? { x: 64, width: 152 }
          : { x: 64, width: 88 };
  const displayValue =
    typeof children === "function" ? children(context.value) : children;
  const renderedValue = displayValue ?? context.value;
  const canRoll =
    typeof renderedValue === "number" || typeof renderedValue === "string";
  const distance = context.reduce || !canRoll ? 0 : context.direction * 32;
  const enterFrom = `translateY(${distance}%)`;
  const exitTo = `translateY(${-distance}%)`;

  return (
    <LiquidItem
      x={geometry.x}
      y={0}
      width={geometry.width}
      height={48}
      radius={24}
      transition={STEPPER_LIQUID_TRANSITION}>
      <motion.output
        {...props}
        aria-live="polite"
        aria-atomic="true"
        style={style}
        className={cn(
          "flex size-full min-w-0 items-center justify-center overflow-hidden rounded-full border border-transparent bg-transparent bg-clip-padding px-4 text-lg font-semibold tabular-nums text-foreground",
          className
        )}>
        <span className="sr-only">{context.valueText}</span>
        <span
          aria-hidden="true"
          className="relative grid min-h-[1.1em] min-w-[1ch] place-items-center overflow-hidden leading-none">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={context.value}
              initial={{
                opacity: context.reduce ? 1 : 0.35,
                filter: context.reduce ? "blur(0px)" : "blur(2px)",
                transform: enterFrom,
              }}
              animate={{
                opacity: 1,
                filter: "blur(0px)",
                transform: "translateY(0%)",
              }}
              exit={{
                opacity: context.reduce ? 1 : 0,
                filter: context.reduce ? "blur(0px)" : "blur(2px)",
                transform: exitTo,
                transition: {
                  duration: context.reduce ? 0 : 0.12,
                  ease: EASE_OUT,
                },
              }}
              transition={{
                duration: context.reduce ? 0 : 0.18,
                ease: EASE_OUT,
              }}
              className="col-start-1 row-start-1 will-change-[transform,filter,opacity]">
              {renderedValue}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.output>
    </LiquidItem>
  );
}

export function AdaptiveStepperIncrement(props) {
  return <StepperAction {...props} direction={1} />;
}
