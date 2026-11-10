"use client";

/** Keep native click activation as the single action path for mouse, keyboard, and touch. */
export function useMobileTap(action: () => void) {
  return {
    onClick: action,
  };
}
