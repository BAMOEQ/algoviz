'use client';

import { useSyncExternalStore, type ChangeEvent, type ReactElement } from 'react';
import {
  getInitSnippets,
  isLanguage,
  LANGUAGES,
  LANGUAGE_NAMES,
  type Language,
} from '@/lib/code/init-snippets';

export const LANGUAGE_STORAGE_KEY = 'algoviz:language';

const DEFAULT_LANGUAGE: Language = 'python';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored && isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** The prerendered HTML cannot know the reader's choice, so it always shows the default. */
function readLanguageOnServer(): Language {
  return DEFAULT_LANGUAGE;
}

function writeLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* A blocked storage write should not stop the snippet from switching. */
  }

  for (const listener of listeners) listener();
}

/**
 * Splits a note into plain and `backticked` runs. Notes name real identifiers, and an identifier
 * set in prose type reads as a typo — this is the only markdown the notes are allowed.
 */
export function splitInlineCode(text: string): Array<{ code: boolean; text: string }> {
  return text
    .split(/`([^`]+)`/)
    .map((part, index) => ({ code: index % 2 === 1, text: part }))
    .filter((part) => part.text.length > 0);
}

/**
 * The structure as you would actually type it, in the language the reader works in.
 *
 * The choice is stored rather than held in state, so it follows the reader from one structure to
 * the next — picking Java once should not have to be done ten times. `useSyncExternalStore` is how
 * this codebase reads that kind of store, the same way `ThemeToggle` does.
 */
export function InitCode({ slug }: { slug: string }): ReactElement {
  const language = useSyncExternalStore(subscribe, readLanguage, readLanguageOnServer);
  const snippets = getInitSnippets(slug);

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value;
    if (isLanguage(next)) writeLanguage(next);
  }

  if (!snippets) {
    return (
      <p className="border border-border bg-surface-1 p-4 font-mono text-sm text-muted">
        The initialization snippet for this structure has not been written yet.
      </p>
    );
  }

  const snippet = snippets[language];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 border border-border bg-surface-1 px-3 py-2">
        <span className="panel-label">Initialize</span>

        <label className="flex items-center gap-2">
          <span className="panel-label">Language</span>
          <select
            aria-label="Language"
            value={language}
            onChange={handleChange}
            className="border border-border-strong bg-surface-0 px-2 py-1 font-mono text-xs text-text transition-colors duration-(--dur-fast) hover:bg-surface-2"
          >
            {LANGUAGES.map((option) => (
              <option key={option} value={option}>
                {LANGUAGE_NAMES[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <pre className="overflow-x-auto border border-border bg-surface-1 p-4">
        <code className="font-mono text-[13px] leading-relaxed whitespace-pre text-text">
          {snippet.code}
        </code>
      </pre>

      <p className="border-l-2 border-hl-compare pl-3 text-sm leading-relaxed text-muted">
        {splitInlineCode(snippet.note).map((part, index) =>
          part.code ? (
            <code
              key={index}
              className="border border-border bg-surface-1 px-1 py-0.5 font-mono text-[13px] text-text"
            >
              {part.text}
            </code>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </p>
    </div>
  );
}
