import { describe, expect, it } from 'vitest';
import { getInitSnippets, isLanguage, LANGUAGES, LANGUAGE_NAMES } from '@/lib/code/init-snippets';
import { structures } from '@/lib/registry';

describe('init snippets', () => {
  it.each(structures.map((structure) => structure.slug))(
    '%s has a snippet in every language',
    (slug) => {
      const snippets = getInitSnippets(slug);
      expect(snippets, `no init snippets for "${slug}"`).toBeDefined();

      for (const language of LANGUAGES) {
        expect(snippets?.[language].code.trim().length ?? 0).toBeGreaterThan(0);
        expect(snippets?.[language].note.trim().length ?? 0).toBeGreaterThan(0);
      }
    },
  );

  it('names every language it offers', () => {
    for (const language of LANGUAGES) {
      expect(LANGUAGE_NAMES[language]).toBeTruthy();
    }
  });

  it('rejects a value that is not a language', () => {
    expect(isLanguage('python')).toBe(true);
    expect(isLanguage('brainfuck')).toBe(false);
  });

  it('has no snippet for a structure that is not registered', () => {
    expect(getInitSnippets('skip-list')).toBeUndefined();
  });
});
