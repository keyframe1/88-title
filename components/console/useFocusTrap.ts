import { useEffect, type RefObject } from "react";

/**
 * Keep keyboard focus inside `containerRef` while `active`, and route Escape to
 * `onEscape`. Pure containment only: it cycles Tab / Shift+Tab at the edges and
 * swallows Escape — it does NOT move focus in on activate or restore it on
 * deactivate. Callers own that (so a nested layer, e.g. a confirm dialog opening
 * over a panel, can suspend the outer trap without the outer trap yanking focus
 * back). The listener is capture-phase so an inner active trap wins over an outer
 * one that is still mounted.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onEscape?: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        onEscape?.();
        return;
      }
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const items = focusable(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey) {
        if (current === first || !container.contains(current)) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last || !container.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [active, containerRef, onEscape]);
}

/** Visible, focusable descendants in DOM order. */
function focusable(root: HTMLElement): HTMLElement[] {
  const selector =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}
