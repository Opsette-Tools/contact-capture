import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Module-level state shared across every useTheme() consumer in the app, so the
// header and the toggle button stay in sync after a flip. Each component that
// calls useTheme() registers a setter; toggle() updates the module value, applies
// the side effects (html.dark class, localStorage), and notifies every setter.
let currentTheme: Theme = getInitialTheme();
const subscribers = new Set<(t: Theme) => void>();

function applySideEffects(t: Theme) {
  if (typeof window === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
  localStorage.setItem("theme", t);
}

function setThemeShared(next: Theme) {
  if (next === currentTheme) return;
  currentTheme = next;
  applySideEffects(next);
  subscribers.forEach((fn) => fn(next));
}

export function useTheme() {
  const [theme, setLocal] = useState<Theme>(currentTheme);

  useEffect(() => {
    subscribers.add(setLocal);
    // Sync this consumer in case currentTheme changed between mount and effect.
    if (currentTheme !== theme) setLocal(currentTheme);
    return () => {
      subscribers.delete(setLocal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply side effects on first ever mount so html.dark + localStorage match
  // currentTheme even if no toggle has happened yet.
  useEffect(() => {
    applySideEffects(currentTheme);
  }, []);

  const toggle = () => setThemeShared(currentTheme === "dark" ? "light" : "dark");

  return { theme, toggle };
}
