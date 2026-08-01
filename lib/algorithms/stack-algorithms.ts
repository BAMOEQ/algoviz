import type { AlgorithmDef } from '@/lib/registry/types';
import type { StackState } from '@/lib/structures/stack';

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
const OPENERS = new Set(Object.values(PAIRS));

/**
 * Reads the stack's contents bottom-to-top as a bracket sequence and checks it balances, using a
 * working stack of its own. Marks index into the structure's cells, so the highlighted cell is the
 * bracket currently being examined.
 */
export const balancedParens: AlgorithmDef<StackState> = {
  id: 'balanced-parens',
  name: 'Balanced Parentheses',
  description: 'Scans the stored bracket sequence and verifies every closer matches the last opener.',
  pseudocode: [
    'for each token in sequence',
    '  if token is an opener',
    '    push token',
    '  else',
    '    if stack is empty or top does not match',
    '      return unbalanced',
    '    pop',
    'return stack is empty',
  ],
  run: (state, t) => {
    const working: number[] = [];

    for (let i = 0; i < state.values.length; i++) {
      const token = state.values[i];

      t.mark(i, 'active');
      t.step(0, `Token ${i}: ${token}.`, { i, token }, { reads: 1 });

      if (OPENERS.has(token)) {
        working.push(i);
        t.mark(i, 'inserted');
        t.step(2, `${token} is an opener — pushed. Depth is now ${working.length}.`, {
          i,
          depth: working.length,
        });
        continue;
      }

      const expected = PAIRS[token];
      if (expected === undefined) {
        t.mark(i, 'removed');
        t.step(4, `${token} is not a bracket — sequence is not balanced.`, { i, token });
        return;
      }

      const topIndex = working[working.length - 1];
      if (topIndex === undefined) {
        t.mark(i, 'removed');
        t.step(4, `${token} closes nothing — sequence is not balanced.`, { i, token }, { comparisons: 1 });
        return;
      }

      t.mark(i, 'compare').mark(topIndex, 'compare');
      t.step(4, `Does ${state.values[topIndex]} match ${token}?`, { i, topIndex }, { comparisons: 1 });

      if (state.values[topIndex] !== expected) {
        t.mark(i, 'removed').mark(topIndex, 'removed');
        t.step(5, `${state.values[topIndex]} does not match ${token} — not balanced.`, { i, topIndex });
        return;
      }

      working.pop();
      t.mark(i, 'visited').mark(topIndex, 'visited');
      t.step(6, `Matched — popped. Depth is now ${working.length}.`, { i, depth: working.length });
    }

    t.step(
      7,
      working.length === 0
        ? 'Every opener was closed — the sequence is balanced.'
        : `${working.length} opener(s) never closed — not balanced.`,
      { unclosed: working.length },
    );
  },
};

/**
 * Evaluates the stored tokens as a postfix (reverse Polish) expression. Operands and operators
 * both come from the stack's own contents, read bottom-to-top.
 */
export const postfixEval: AlgorithmDef<StackState> = {
  id: 'postfix-eval',
  name: 'Postfix Evaluation',
  description: 'Evaluates the stored tokens as a reverse Polish expression.',
  pseudocode: [
    'for each token in expression',
    '  if token is a number',
    '    push token',
    '  else',
    '    b = pop, a = pop',
    '    push (a op b)',
    'return top of stack',
  ],
  run: (state, t) => {
    const operands: number[] = [];

    for (let i = 0; i < state.values.length; i++) {
      const token = state.values[i];

      t.mark(i, 'active');
      t.step(0, `Token ${i}: ${token}.`, { i, token }, { reads: 1 });

      const numeric = Number(token);
      if (token.trim() !== '' && Number.isFinite(numeric)) {
        operands.push(numeric);
        t.mark(i, 'inserted');
        t.step(2, `${numeric} is a number — pushed.`, { i, stack: operands.join(' ') });
        continue;
      }

      const b = operands.pop();
      const a = operands.pop();

      if (a === undefined || b === undefined) {
        t.mark(i, 'removed');
        t.step(4, `${token} needs two operands but the stack holds ${operands.length}.`, { i, token });
        return;
      }

      t.mark(i, 'compare');
      t.step(4, `${token} pops ${a} and ${b}.`, { i, a, b }, { reads: 2 });

      let result: number;
      switch (token) {
        case '+':
          result = a + b;
          break;
        case '-':
          result = a - b;
          break;
        case '*':
          result = a * b;
          break;
        case '/':
          result = b === 0 ? Number.NaN : a / b;
          break;
        default:
          t.mark(i, 'removed');
          t.step(4, `${token} is not a supported operator.`, { i, token });
          return;
      }

      operands.push(result);
      t.mark(i, 'visited');
      t.step(5, `${a} ${token} ${b} = ${result}. Pushed.`, { i, result }, { writes: 1 });
    }

    const answer = operands[operands.length - 1];
    t.step(
      6,
      operands.length === 1
        ? `Expression evaluates to ${answer}.`
        : `Expression left ${operands.length} values on the stack — it is malformed.`,
      { result: answer ?? null },
    );
  },
};
