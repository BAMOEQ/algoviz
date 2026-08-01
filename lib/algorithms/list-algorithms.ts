import type { AlgorithmDef } from '@/lib/registry/types';
import { nodeId, type LinkedListState } from '@/lib/structures/linked-list';

export const traverseList: AlgorithmDef<LinkedListState> = {
  id: 'list-traversal',
  name: 'Traversal',
  description: 'Walks from the head to the null terminator, one link at a time.',
  pseudocode: ['node = head', 'while node is not null', '  visit node', '  node = node.next'],
  run: (state, t) => {
    if (state.values.length === 0) {
      t.step(0, 'The list is empty — there is nothing to walk.', {});
      return;
    }

    t.mark(nodeId(0), 'active');
    t.step(0, 'Starting at the head.', { position: 0 });

    for (let index = 0; index < state.values.length; index++) {
      for (let seen = 0; seen < index; seen++) t.mark(nodeId(seen), 'visited');
      t.mark(nodeId(index), 'active');
      t.step(2, `Visiting node ${index}, which holds ${state.values[index]}.`, {
        position: index,
        value: state.values[index],
      }, { reads: 1 });

      if (index < state.values.length - 1) {
        for (let seen = 0; seen <= index; seen++) t.mark(nodeId(seen), 'visited');
        t.mark(`link-${index}`, 'path');
        t.step(3, `Following the link to node ${index + 1}.`, { position: index + 1 });
      }
    }

    for (let index = 0; index < state.values.length; index++) t.mark(nodeId(index), 'visited');
    t.step(1, `Reached the terminator after ${state.values.length} node(s).`, {
      visited: state.values.length,
    });
  },
};

export const reverseList: AlgorithmDef<LinkedListState> = {
  id: 'list-reversal',
  name: 'Reversal',
  description: 'Re-points every link backwards using three cursors, in a single pass.',
  pseudocode: [
    'prev = null, node = head',
    'while node is not null',
    '  next = node.next',
    '  node.next = prev',
    '  prev = node, node = next',
    'head = prev',
  ],
  run: (state, t) => {
    if (state.values.length < 2) {
      t.step(0, 'A list of fewer than two nodes is already reversed.', {});
      return;
    }

    t.mark(nodeId(0), 'active');
    t.step(0, 'prev is null; node starts at the head.', { prev: null, node: 0 });

    for (let index = 0; index < state.values.length; index++) {
      t.mark(nodeId(index), 'active');
      if (index > 0) t.mark(nodeId(index - 1), 'compare');
      t.step(2, `next = node ${index + 1 < state.values.length ? index + 1 : 'null'}.`, {
        node: index,
        value: state.values[index],
      }, { reads: 1 });

      t.mark(nodeId(index), 'path');
      if (index > 0) t.mark(nodeId(index - 1), 'visited');
      t.step(3, `Re-pointing node ${index} at ${index === 0 ? 'null' : `node ${index - 1}`}.`, {
        node: index,
      }, { writes: 1 });
    }

    state.values.reverse();

    for (let index = 0; index < state.values.length; index++) t.mark(nodeId(index), 'visited');
    t.step(5, `Reversed. ${state.values[0]} is the new head.`, { head: state.values[0] });
  },
};

export const cycleDetection: AlgorithmDef<LinkedListState> = {
  id: 'cycle-detection',
  name: "Cycle Detection (Floyd's)",
  description: 'Advances a slow and a fast pointer; they meet if and only if the list has a cycle.',
  pseudocode: [
    'slow = head, fast = head',
    'while fast and fast.next are not null',
    '  slow = slow.next',
    '  fast = fast.next.next',
    '  if slow == fast',
    '    return cycle found',
    'return no cycle',
  ],
  run: (state, t) => {
    const n = state.values.length;
    if (n === 0) {
      t.step(0, 'The list is empty — there is no cycle.', {});
      return;
    }

    /** Follows one link, honouring the tail's cycle back-reference. Returns null at the terminator. */
    const nextOf = (index: number): number | null => {
      if (index < n - 1) return index + 1;
      return state.cycleTo;
    };

    let slow: number | null = 0;
    let fast: number | null = 0;

    t.mark(nodeId(0), 'active');
    t.step(0, 'Both pointers start at the head.', { slow: 0, fast: 0 });

    for (let guard = 0; guard <= n * 2 + 2; guard++) {
      const fastNext = fast === null ? null : nextOf(fast);
      if (fast === null || fastNext === null) {
        t.step(6, 'The fast pointer reached the terminator — there is no cycle.', {
          slow,
          fast,
        });
        return;
      }

      slow = slow === null ? null : nextOf(slow);
      fast = nextOf(fastNext);

      if (slow === null || fast === null) {
        t.step(6, 'A pointer reached the terminator — there is no cycle.', { slow, fast });
        return;
      }

      t.mark(nodeId(slow), 'compare').mark(nodeId(fast), 'active');
      t.step(3, `slow is at node ${slow}, fast is at node ${fast}.`, { slow, fast }, { reads: 2 });

      t.mark(nodeId(slow), 'compare').mark(nodeId(fast), 'active');
      t.step(4, `Do the pointers meet? ${slow === fast ? 'Yes.' : 'Not yet.'}`, { slow, fast }, { comparisons: 1 });

      if (slow === fast) {
        t.mark(nodeId(slow), 'path');
        t.step(5, `Both pointers are at node ${slow} — the list has a cycle.`, { meetingPoint: slow });
        return;
      }
    }

    t.step(6, 'No cycle was found.', {});
  },
};

export const middleNode: AlgorithmDef<LinkedListState> = {
  id: 'middle-node',
  name: 'Middle Node',
  description: 'Finds the midpoint in one pass using the same slow/fast pointer trick.',
  pseudocode: [
    'slow = head, fast = head',
    'while fast and fast.next are not null',
    '  slow = slow.next',
    '  fast = fast.next.next',
    'return slow',
  ],
  run: (state, t) => {
    const n = state.values.length;
    if (n === 0) {
      t.step(0, 'The list is empty — there is no middle node.', {});
      return;
    }

    let slow = 0;
    let fast = 0;

    t.mark(nodeId(0), 'active');
    t.step(0, 'Both pointers start at the head.', { slow, fast });

    while (fast + 1 < n) {
      slow += 1;
      fast += 2;
      const fastPosition = Math.min(fast, n - 1);

      t.mark(nodeId(slow), 'compare').mark(nodeId(fastPosition), 'active');
      t.step(
        3,
        `slow advanced one to node ${slow}; fast advanced two to node ${fastPosition}.`,
        { slow, fast: fastPosition },
        { reads: 2 },
      );
    }

    t.mark(nodeId(slow), 'path');
    t.step(4, `Fast reached the end, so node ${slow} holding ${state.values[slow]} is the middle.`, {
      middle: slow,
      value: state.values[slow],
    });
  },
};
