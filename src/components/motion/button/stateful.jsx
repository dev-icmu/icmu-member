"use client";
// Installed from beui.dev/r/button-stateful.json.
// Keep the controlled beUI API with a quiet label/icon swap for repeated admin actions.

import { Check, Loader2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { forwardRef } from "react";
import { EASE_OUT } from "@/lib/ease";
import { Button } from "./base";

export const StatefulButton = forwardRef(function StatefulButton(
  {
    state = "idle",
    children,
    loadingText = "Loading...",
    successText = "Done",
    errorText = "Try again",
    icon,
    disabled,
    type = "button",
    "aria-busy": ariaBusy,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();
  const isBusy = state === "loading";
  const stateText = isBusy ? loadingText : state === "success" ? successText : state === "error" ? errorText : children;
  const stateIcon = isBusy
    ? <Loader2 className={reduce ? "h-4 w-4" : "h-4 w-4 animate-spin"} />
    : state === "success" ? <Check className="h-4 w-4" />
      : state === "error" ? <X className="h-4 w-4" /> : icon;
  const textKey = typeof stateText === "string" ? `${state}-${stateText}` : state;

  return (
    <Button
      {...rest}
      ref={ref}
      type={type}
      data-state={state}
      disabled={disabled || isBusy}
      aria-busy={isBusy || ariaBusy}
      whileHover={undefined}
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">{stateText}</span>
      <span aria-hidden="true" className="relative inline-grid items-center justify-items-center overflow-hidden align-middle">
        <span className="invisible col-start-1 row-start-1 inline-grid">
          {[["idle", children], ["loading", loadingText], ["success", successText], ["error", errorText]].map(([key, label]) => (
            <span key={key} className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <span className="h-4 w-4 shrink-0" />{label}
            </span>
          ))}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={textKey}
            className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            initial={{ opacity: 0, transform: reduce ? "none" : "translateY(20%)" }}
            animate={{ opacity: 1, transform: reduce ? "none" : "translateY(0%)" }}
            exit={{ opacity: 0, transform: reduce ? "none" : "translateY(-20%)" }}
            transition={{ duration: reduce ? 0.1 : 0.16, ease: EASE_OUT }}
          >
            {stateIcon}
            {stateText}
          </motion.span>
        </AnimatePresence>
      </span>
    </Button>
  );
});
