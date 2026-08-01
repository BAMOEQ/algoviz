'use client';

import { useCallback, useSyncExternalStore, type ReactElement } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'algoviz:theme';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Dark is the server-rendered default, which matches the token defaults in `globals.css`. */
function readServerTheme(): Theme {
  return 'dark';
}

function writeTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* A blocked storage write should not stop the theme from applying. */
  }

  for (const listener of listeners) listener();
}

/**
 * Dark is the default and carries no attribute; light is an explicit `data-theme` on the root,
 * which is what the token override in `globals.css` keys off.
 *
 * The theme lives in the DOM and localStorage rather than in React state — `useSyncExternalStore`
 * is the sanctioned way to read an external store without a setState-in-effect cascade.
 */
export function ThemeToggle(): ReactElement {
  const theme = useSyncExternalStore(subscribe, readTheme, readServerTheme);

  const toggle = useCallback(() => {
    writeTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="panel-label border border-border bg-surface-1 px-2 py-1 transition-colors duration-(--dur-fast) hover:border-border-strong hover:text-text"
    >
      {theme === 'dark' ? 'light' : 'dark'}
    </button>
  );
}
