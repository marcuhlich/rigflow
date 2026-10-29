import { useEffect, useRef } from "react";

interface Handlers {
  undo: () => void;
  redo: () => void;
  focusSearch: () => void;
  addItem: () => void;
  toggleView: () => void;
  toggleSelectionMode: () => void;
  escape: () => void;
}

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

/** Inventory keyboard shortcuts. Registered once; handlers are read from a ref. */
export function useInventoryShortcuts(handlers: Handlers, enabled = true) {
  const ref = useRef(handlers);
  useEffect(() => { ref.current = handlers; });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // Leave text fields (native text undo!) and open dialogs/menus alone.
      if (isEditable(document.activeElement)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;

      const h = ref.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z" && !e.shiftKey) { e.preventDefault(); h.undo(); return; }
      if (mod && (key === "y" || (key === "z" && e.shiftKey))) { e.preventDefault(); h.redo(); return; }
      if (mod || e.altKey) return;

      switch (e.key) {
        case "/":
        case "f":
          e.preventDefault(); h.focusSearch(); break;
        case "n":
        case "+":
          e.preventDefault(); h.addItem(); break;
        case "v":
          h.toggleView(); break;
        case "m":
          h.toggleSelectionMode(); break;
        case "Escape":
          h.escape(); break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
